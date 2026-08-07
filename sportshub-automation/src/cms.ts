import { config } from './config.js';
import type { DraftPayload } from './types.js';

export interface CmsResult {
  ok: boolean;
  status: number;
  created: boolean; // true = new draft, false = already existed (idempotent)
  id?: string;
  editUrl?: string;
  raw?: unknown;
}

/**
 * POST a draft article to the CMS. The endpoint MUST:
 *  - authenticate the Bearer token
 *  - de-duplicate on `externalId` (return the existing draft, do not create a copy)
 *  - store everything as status = "draft" (never auto-publish)
 * See docs/cms-endpoint-contract.md for the full contract.
 */
export async function pushDraft(payload: DraftPayload): Promise<CmsResult> {
  const res = await fetch(config.cms.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.cms.token}`,
      'Idempotency-Key': payload.externalId,
    },
    body: JSON.stringify(payload),
  });

  let body: any = undefined;
  try {
    body = await res.json();
  } catch {
    /* endpoint may return empty body */
  }

  return {
    ok: res.ok,
    status: res.status,
    created: res.status === 201,
    id: body?.id,
    editUrl: body?.editUrl,
    raw: body,
  };
}
