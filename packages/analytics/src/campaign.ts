import type { Campaign } from './types'

export function emptyCampaign(): Campaign {
  return {
    source: null,
    medium: null,
    campaign: null,
    content: null,
    term: null,
    gclid: null,
    fbclid: null,
  }
}

export function parseCampaignFromSearch(search: string): Campaign {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return {
    source: params.get('utm_source'),
    medium: params.get('utm_medium'),
    campaign: params.get('utm_campaign'),
    content: params.get('utm_content'),
    term: params.get('utm_term'),
    gclid: params.get('gclid'),
    fbclid: params.get('fbclid'),
  }
}

export function campaignHasValues(campaign: Campaign): boolean {
  return Boolean(
    campaign.source ||
    campaign.medium ||
    campaign.campaign ||
    campaign.content ||
    campaign.term ||
    campaign.gclid ||
    campaign.fbclid,
  )
}

/** First-touch attribution: keep the original campaign unless empty. */
export function mergeFirstTouchCampaign(existing: Campaign | null, incoming: Campaign): Campaign {
  if (!existing || !campaignHasValues(existing)) return incoming
  if (!campaignHasValues(incoming)) return existing
  return existing
}
