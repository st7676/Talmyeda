import { Injectable } from '@nestjs/common';
import { Model, Types } from 'mongoose';
import { FieldEntityType } from '../../common/enums';
import { AppError } from '../../common/errors/app-error';
import { FieldDefinitionsService } from '../field-definitions/field-definitions.service';

/**
 * Shared dynamic-field filter/sort logic (spec 38-40), extracted so
 * Participants/Staff/Groups (and any future dynamic-schema entity) don't
 * each reimplement the aggregation pipeline. Originally lived only in
 * ParticipantsService.findSortedByDynamicField; moved here verbatim when
 * extending the same feature to Staff and Groups (2026-08-13) so the
 * `.aggregate()` manual-ObjectId-cast rule (critical bug #2, PROGRESS.md
 * 2026-08-13) only has to be applied — and remembered — in one place.
 */
export interface DynamicQueryOptions {
  page: number;
  limit: number;
  /** JSON-encoded {internalKey: value} object. Only filterable fields allowed (spec 39). */
  filters?: string;
  /** A system field name or a dynamic field's internalKey. */
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  /** Field names sortable via a plain index-backed sort without touching FieldDefinitions. */
  systemSortFields: Set<string>;
  /** Sort used when no sortBy is given. Defaults to { createdAt: -1 }. */
  defaultSort?: Record<string, 1 | -1>;
}

@Injectable()
export class DynamicQueryService {
  constructor(
    private readonly fieldDefinitionsService: FieldDefinitionsService,
  ) {}

  /**
   * Runs a paginated find (or, when sorting by a dynamic field, an
   * aggregation pipeline) against `model`, applying dynamic-field
   * filter/sort validated against that institution's FieldDefinitions.
   * `baseFilter` must already include institutionId/isDeleted/any other
   * caller-side scoping (e.g. context-aware group scoping) — this method
   * only adds dynamic-field clauses and sorting on top of it.
   */
  async findAll<TDoc>(
    model: Model<TDoc>,
    institutionId: string,
    entityType: FieldEntityType,
    baseFilter: Record<string, unknown>,
    options: DynamicQueryOptions,
  ): Promise<{
    // Aggregation results (dynamic sort) are plain objects, not hydrated
    // documents — callers (toReadable helpers) already handle both shapes
    // generically, so we normalize to the common denominator here.
    items: (TDoc | Record<string, unknown>)[];
    total: number;
    definitionsByKey: Map<
      string,
      {
        internalKey: string;
        displayName: string;
        searchSettings: { sortable: boolean; filterable: boolean };
      }
    >;
  }> {
    const { page, limit, filters, sortBy, sortDir } = options;
    const filter: Record<string, unknown> = { ...baseFilter };

    const definitions = await this.fieldDefinitionsService.findActiveForEntity(
      institutionId,
      entityType,
    );
    const definitionsByKey = new Map(
      definitions.map((d) => [
        d.internalKey,
        {
          internalKey: d.internalKey,
          displayName: d.displayName,
          searchSettings: d.searchSettings,
        },
      ]),
    );

    if (filters) {
      this.applyDynamicFilters(filter, filters, definitionsByKey);
    }

    const direction = sortDir === 'desc' ? -1 : 1;
    let dynamicSortKey: string | null = null;
    let sortStage: Record<string, 1 | -1> = options.defaultSort ?? {
      createdAt: -1,
    };
    if (sortBy) {
      if (options.systemSortFields.has(sortBy)) {
        sortStage = { [sortBy]: direction };
      } else {
        const definition = definitionsByKey.get(sortBy);
        if (!definition) {
          throw AppError.validation(
            `Unknown sort field: ${sortBy}`,
            'UNKNOWN_SORT_FIELD',
          );
        }
        if (!definition.searchSettings.sortable) {
          throw AppError.validation(
            `Field "${definition.displayName}" is not sortable`,
            'FIELD_NOT_SORTABLE',
          );
        }
        dynamicSortKey = sortBy;
      }
    }

    const [items, total] = await Promise.all([
      dynamicSortKey
        ? this.findSortedByDynamicField(
            model,
            filter,
            dynamicSortKey,
            direction,
            page,
            limit,
          )
        : model
            .find(filter)
            .sort(sortStage)
            .skip((page - 1) * limit)
            .limit(limit)
            .exec(),
      model.countDocuments(filter).exec(),
    ]);

    return { items, total, definitionsByKey };
  }

  /**
   * Dynamic filtering (spec 39): only fields marked filterable may be used.
   * Each {key: value} pair becomes an $elemMatch clause; AND-ed together via
   * $all so a matching document must contain every requested pair.
   */
  private applyDynamicFilters(
    filter: Record<string, unknown>,
    rawFilters: string,
    definitionsByKey: Map<
      string,
      { displayName: string; searchSettings: { filterable: boolean } }
    >,
  ): void {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawFilters);
    } catch {
      throw AppError.validation(
        'filters must be a JSON object, e.g. {"field_x":"value"}',
        'INVALID_FILTERS',
      );
    }
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      throw AppError.validation(
        'filters must be a JSON object',
        'INVALID_FILTERS',
      );
    }

    const clauses: Record<string, unknown>[] = [];
    for (const [key, value] of Object.entries(
      parsed as Record<string, unknown>,
    )) {
      const definition = definitionsByKey.get(key);
      if (!definition) {
        throw AppError.validation(
          `Unknown filter field: ${key}`,
          'UNKNOWN_FILTER_FIELD',
        );
      }
      if (!definition.searchSettings.filterable) {
        throw AppError.validation(
          `Field "${definition.displayName}" is not filterable`,
          'FIELD_NOT_FILTERABLE',
        );
      }
      clauses.push({ $elemMatch: { k: key, v: value } });
    }
    if (clauses.length > 0) {
      filter.customFields = { $all: clauses };
    }
  }

  /**
   * Dynamic sorting (spec 40): sorting by a customFields value requires an
   * aggregation pipeline (match, extract the matching entry's v, sort by
   * it) rather than a simple index-backed sort, since the value lives
   * inside an array element rather than a top-level field.
   *
   * Unlike .find()/.findOne(), .aggregate() is passed straight to the
   * MongoDB driver and never goes through Mongoose's automatic query
   * casting — a string institutionId in `filter` would silently never
   * match the real ObjectId stored on each document, returning zero
   * results. Cast it explicitly before it reaches $match (critical bug #2,
   * PROGRESS.md 2026-08-13 — caught by
   * test/integration/dynamic-field-sort-filter.integration-spec.ts).
   */
  private async findSortedByDynamicField<TDoc>(
    model: Model<TDoc>,
    filter: Record<string, unknown>,
    sortKey: string,
    direction: 1 | -1,
    page: number,
    limit: number,
  ): Promise<Record<string, unknown>[]> {
    const matchFilter = { ...filter };
    if (typeof matchFilter.institutionId === 'string') {
      matchFilter.institutionId = new Types.ObjectId(matchFilter.institutionId);
    }

    const pipeline = [
      { $match: matchFilter },
      {
        $addFields: {
          __sortValue: {
            $let: {
              vars: {
                match: {
                  $first: {
                    $filter: {
                      input: '$customFields',
                      as: 'cf',
                      cond: { $eq: ['$$cf.k', sortKey] },
                    },
                  },
                },
              },
              in: '$$match.v',
            },
          },
        },
      },
      { $sort: { __sortValue: direction } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      { $unset: '__sortValue' },
    ];
    return model.aggregate<Record<string, unknown>>(pipeline).exec();
  }
}
