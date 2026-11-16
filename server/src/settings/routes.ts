import type { FastifyInstance } from 'fastify';
import type { Pool } from 'pg';
import { type Auth, requireSession } from '../access/auth.ts';

// Spec, Settings: interface language (Arabic default) and an optional target band, stored and shown only.
const INTERFACE_LANGUAGES = ['ar', 'en'] as const;
const TARGET_BANDS = ['5.5', '6.0', '6.5', '7.0+'] as const;

type Settings = {
  interfaceLanguage: (typeof INTERFACE_LANGUAGES)[number];
  targetBand: (typeof TARGET_BANDS)[number] | null;
};

const DEFAULTS: Settings = { interfaceLanguage: 'ar', targetBand: null };
const SETTINGS_COLUMNS = 'interface_language as "interfaceLanguage", target_band as "targetBand"';

// ME-01 GET /me/settings and ME-02 PATCH /me/settings: the caller's own settings only (CS 2.1).
export async function settingsRoutes(fastify: FastifyInstance, { auth, db }: { auth: Auth; db: Pool }) {
  const preValidation = requireSession(auth); // before body validation: anonymous always gets 401

  fastify.get('/me/settings', { preValidation }, async (request) => {
    const { rows } = await db.query<Settings>(`select ${SETTINGS_COLUMNS} from learner_settings where user_id = $1`, [
      request.user?.id,
    ]);
    return rows[0] ?? DEFAULTS;
  });

  fastify.patch<{ Body: Partial<Settings> }>(
    '/me/settings',
    {
      preValidation,
      schema: {
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            interfaceLanguage: { type: 'string', enum: INTERFACE_LANGUAGES },
            targetBand: { anyOf: [{ type: 'string', enum: TARGET_BANDS }, { type: 'null' }] },
          },
        },
      },
    },
    async (request) => {
      const { interfaceLanguage, targetBand } = request.body;
      // Absent fields keep their stored value; targetBand: null clears it.
      const { rows } = await db.query<Settings>(
        `insert into learner_settings (user_id, interface_language, target_band) values ($1, coalesce($2, 'ar'), $3)
         on conflict (user_id) do update set
           interface_language = coalesce($2, learner_settings.interface_language),
           target_band = case when $4 then $3 else learner_settings.target_band end,
           updated_at = now()
         returning ${SETTINGS_COLUMNS}`,
        [request.user?.id, interfaceLanguage ?? null, targetBand ?? null, targetBand !== undefined],
      );
      return rows[0];
    },
  );
}
