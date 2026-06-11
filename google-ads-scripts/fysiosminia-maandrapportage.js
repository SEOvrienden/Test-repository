/**
 * ============================================================================
 *  Maandrapportage Google Ads  -  Fysiotherapie Sminia
 *  Gemaakt door SEO Vrienden (https://seovrienden.nl)
 * ----------------------------------------------------------------------------
 *  Stuurt automatisch een korte, branded HTML-mail met de accountprestaties
 *  van de afgelopen kalendermaand. De cijfers staan PER CAMPAGNE (echte data,
 *  incl. het werkelijke zoekvertoningspercentage per campagne). Onderaan staat
 *  een totaalregel met de vergelijking t.o.v. de maand ervoor, plus een top 20
 *  van best presterende zoekwoorden (op klikken).
 *
 *  Plaatsen: Google Ads -> Extra & instellingen -> Bulkacties -> Scripts
 *  Frequentie: stel je zelf in bij het inplannen van het script (bv. maandelijks).
 * ============================================================================
 */

// ===========================================================================
//  INSTELLINGEN  -  pas dit blok aan en verder hoef je niets te wijzigen
// ===========================================================================
var CONFIG = {
  // --- Ontvangers --------------------------------------------------------
  recipient: 'terry.bosma@fysiosminia.nl',
  cc:        'support@seovrienden.nl',
  bcc:       '',

  // --- Klant / afzender --------------------------------------------------
  clientName:  'Fysiotherapie Sminia',
  clientUrl:   'https://www.fysiosminia.nl/',
  agencyName:  'SEO Vrienden',
  agencyUrl:   'https://seovrienden.nl/',
  agencyEmail: 'support@seovrienden.nl',

  // --- Huisstijl SEO Vrienden -------------------------------------------
  brand: {
    // Logo's worden als afbeelding in de mail geladen: gebruik publiek bereikbare URL's.
    agencyLogoUrl: 'VUL-HIER-DE-DIRECTE-URL-VAN-HET-SEO-VRIENDEN-LOGO-IN.png', // <-- INVULLEN (gehoste afbeelding)
    clientLogoUrl: 'https://www.fysiosminia.nl/wp-content/uploads/2019/02/Sminia-Logo-1.jpg',

    orange:  '#E94F1C', // accent (sectiekoppen, links)
    green:   '#004744', // donkergroen (tabelkoppen, footer)
    cream:   '#F8EED3', // crème/beige (tekst op donkergroen)
    text:    '#2B2B2B',
    muted:   '#6B7280',
    border:  '#E5E7EB',
    bg:      '#F4F5F7',
    positive:'#1A8917', // groen voor positieve ontwikkeling
    negative:'#C62828'  // rood voor negatieve ontwikkeling
  },

  // --- Rapportage-opties -------------------------------------------------
  keywordLimit: 20,
  currencySymbol: '€', // wordt overschreven door de accountvaluta indien beschikbaar

  // Voor welke metrics is een stijging gunstig (groen) of ongunstig (rood)?
  higherIsBetter: {
    cost: false, impressions: true, clicks: true, ctr: true, avgCpc: false,
    allConv: true, conv: true, costPerConv: false, convRate: true, searchIs: true
  }
};

// ===========================================================================
//  HOOFDPROGRAMMA
// ===========================================================================
function main() {
  var tz = AdsApp.currentAccount().getTimeZone();
  try {
    CONFIG.currencySymbol = currencySymbolFor(AdsApp.currentAccount().getCurrencyCode());
  } catch (e) { /* val terug op standaard symbool */ }

  var current  = lastMonthRange(tz);       // afgelopen volledige kalendermaand
  var previous = monthBefore(current, tz);  // de maand daarvoor

  var cur  = getCampaignData(current.start, current.end);
  var prev = getCampaignData(previous.start, previous.end);
  var keywords = getTopKeywords(current.start, current.end, CONFIG.keywordLimit);

  var html = buildEmail(cur, prev, keywords, current, previous);
  var subject = 'Google Ads maandrapportage ' + CONFIG.clientName + ' - ' + current.label;

  MailApp.sendEmail({
    to:       CONFIG.recipient,
    cc:       CONFIG.cc || undefined,
    bcc:      CONFIG.bcc || undefined,
    subject:  subject,
    htmlBody: html,
    name:     CONFIG.agencyName
  });

  Logger.log('Rapportage verstuurd naar: ' + CONFIG.recipient + ' (cc: ' + CONFIG.cc + ')');
  Logger.log('Periode: ' + current.label + ' vs ' + previous.label);
}

// ===========================================================================
//  DATA OPHALEN  (alles op campagneniveau, echte data)
// ===========================================================================

/**
 * Haalt per campagne de cijfers op voor de opgegeven periode.
 * Geeft een lijst met ruwe campagnestatistieken terug plus een index op
 * campagne-id, zodat we per campagne kunnen vergelijken tussen periodes.
 */
function getCampaignData(startDate, endDate) {
  var query =
    'SELECT campaign.id, campaign.name, campaign.advertising_channel_type, ' +
    '       metrics.cost_micros, metrics.impressions, metrics.clicks, ' +
    '       metrics.all_conversions, metrics.conversions, ' +
    '       metrics.search_impression_share ' +
    'FROM campaign ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "' " +
    '  AND metrics.impressions > 0';

  var list = [], byId = {};
  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var m = r.metrics;
    var isSearch = r.campaign && r.campaign.advertisingChannelType === 'SEARCH';
    var sisRaw = (m.searchImpressionShare === undefined || m.searchImpressionShare === null)
      ? null : Number(m.searchImpressionShare);

    var raw = {
      id:          r.campaign.id,
      name:        r.campaign.name,
      isSearch:    isSearch,
      cost:        micros(m.costMicros),
      impressions: Number(m.impressions) || 0,
      clicks:      Number(m.clicks) || 0,
      allConv:     Number(m.allConversions) || 0,
      conv:        Number(m.conversions) || 0,
      searchIs:    isSearch ? sisRaw : null   // alleen zinvol voor zoekcampagnes
    };
    list.push(raw);
    byId[raw.id] = raw;
  }
  return { list: list, byId: byId };
}

/** Top N zoekwoorden van de periode, gesorteerd op klikken (alleen actieve). */
function getTopKeywords(startDate, endDate, limit) {
  var query =
    'SELECT ad_group_criterion.keyword.text, ' +
    '       ad_group_criterion.keyword.match_type, ' +
    '       metrics.impressions, metrics.clicks, metrics.ctr, ' +
    '       metrics.average_cpc, metrics.conversions, metrics.all_conversions ' +
    'FROM keyword_view ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "' " +
    "  AND ad_group_criterion.status = 'ENABLED' " +
    "  AND campaign.status = 'ENABLED' " +
    '  AND metrics.impressions > 0 ' +
    'ORDER BY metrics.clicks DESC ' +
    'LIMIT ' + limit;

  var out = [];
  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var m = r.metrics;
    out.push({
      text:        r.adGroupCriterion.keyword.text,
      matchType:   matchTypeLabel(r.adGroupCriterion.keyword.matchType),
      impressions: Number(m.impressions) || 0,
      clicks:      Number(m.clicks) || 0,
      ctr:         Number(m.ctr) || 0,
      avgCpc:      micros(m.averageCpc),
      conv:        Number(m.conversions) || 0,
      allConv:     Number(m.allConversions) || 0
    });
  }
  return out;
}

/** Berekent afgeleide metrics (CTR, CPC, etc.) uit ruwe campagnetotalen. */
function derive(raw) {
  return {
    cost:        raw.cost,
    impressions: raw.impressions,
    clicks:      raw.clicks,
    ctr:         raw.impressions ? raw.clicks / raw.impressions : 0,
    avgCpc:      raw.clicks ? raw.cost / raw.clicks : 0,
    allConv:     raw.allConv,
    conv:        raw.conv,
    costPerConv: raw.conv ? raw.cost / raw.conv : 0,
    convRate:    raw.clicks ? raw.conv / raw.clicks : 0,
    searchIs:    raw.searchIs // null voor totaal/niet-zoekcampagnes
  };
}

/** Sommeert een lijst ruwe campagnestatistieken tot één totaal (searchIs = null). */
function sumRaw(list) {
  var t = { cost: 0, impressions: 0, clicks: 0, allConv: 0, conv: 0, searchIs: null, isSearch: false };
  for (var i = 0; i < list.length; i++) {
    t.cost += list[i].cost; t.impressions += list[i].impressions;
    t.clicks += list[i].clicks; t.allConv += list[i].allConv; t.conv += list[i].conv;
  }
  return t;
}

// ===========================================================================
//  E-MAIL OPBOUWEN
// ===========================================================================
function buildEmail(cur, prev, keywords, current, previous) {
  var b = CONFIG.brand;

  // Campagnes sorteren op kosten (hoog -> laag).
  var campaigns = cur.list.slice().sort(function (a, z) { return z.cost - a.cost; });

  // Detailregels per campagne (alleen huidige maand, echte data).
  var campaignRows = campaigns.length ? campaigns.map(function (raw) {
    var d = derive(raw);
    return '' +
      '<tr>' +
        td(escapeHtml(raw.name), 'left') +
        td(fmtCurrency(d.cost)) +
        td(fmtInt(d.impressions)) +
        td(fmtInt(d.clicks)) +
        td(fmtPercent(d.ctr)) +
        td(fmtCurrency(d.avgCpc)) +
        td(fmtDecimal(d.allConv)) +
        td(fmtDecimal(d.conv)) +
        td(fmtCurrency(d.costPerConv)) +
        td(fmtPercent(d.convRate)) +
        td(d.searchIs === null ? '&ndash;' : fmtPercent(d.searchIs)) +
      '</tr>';
  }).join('') :
  '<tr><td colspan="11" style="padding:14px;text-align:center;color:' + b.muted + ';">Geen campagnedata voor deze periode.</td></tr>';

  // Totaalregel met vergelijking t.o.v. vorige maand.
  var curTot  = derive(sumRaw(cur.list));
  var prevTot = derive(sumRaw(prev.list));
  var totalRow =
    '<tr style="background:' + b.bg + ';font-weight:bold;">' +
      '<td style="padding:10px 10px;border-top:2px solid ' + b.green + ';text-align:left;">Totaal</td>' +
      totalCell(curTot.cost,        prevTot.cost,        'currency', 'cost') +
      totalCell(curTot.impressions, prevTot.impressions, 'int',      'impressions') +
      totalCell(curTot.clicks,      prevTot.clicks,      'int',      'clicks') +
      totalCell(curTot.ctr,         prevTot.ctr,         'percent',  'ctr') +
      totalCell(curTot.avgCpc,      prevTot.avgCpc,      'currency', 'avgCpc') +
      totalCell(curTot.allConv,     prevTot.allConv,     'decimal',  'allConv') +
      totalCell(curTot.conv,        prevTot.conv,        'decimal',  'conv') +
      totalCell(curTot.costPerConv, prevTot.costPerConv, 'currency', 'costPerConv') +
      totalCell(curTot.convRate,    prevTot.convRate,    'percent',  'convRate') +
      '<td style="padding:10px 10px;border-top:2px solid ' + b.green + ';text-align:right;">&ndash;</td>' +
    '</tr>';

  // Zoekwoordregels (kolomvolgorde zoals in het Google Ads-rapport).
  var keywordRows = keywords.length ? keywords.map(function (k) {
    return '' +
      '<tr>' +
        td(escapeHtml(k.text) + ' <span style="color:' + b.muted + ';font-size:11px;">[' + k.matchType + ']</span>', 'left') +
        td(fmtInt(k.impressions)) +
        td(fmtInt(k.clicks)) +
        td(fmtPercent(k.ctr)) +
        td(fmtCurrency(k.avgCpc)) +
        td(fmtDecimal(k.conv)) +
        td(fmtDecimal(k.allConv)) +
      '</tr>';
  }).join('') :
  '<tr><td colspan="7" style="padding:14px;text-align:center;color:' + b.muted + ';">Geen zoekwoorddata voor deze periode.</td></tr>';

  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
'<body style="margin:0;padding:0;background:' + b.bg + ';">' +
'<div style="font-family:Arial,Helvetica,sans-serif;color:' + b.text + ';max-width:760px;margin:0 auto;background:' + b.bg + ';padding:16px;">' +

  // Kaart
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ' + b.border + ';">' +

    // Header (logo's op witte achtergrond + oranje accentlijn)
    '<tr><td style="padding:22px 26px 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
        '<td style="text-align:left;vertical-align:middle;">' +
          '<img src="' + b.agencyLogoUrl + '" alt="' + escapeHtml(CONFIG.agencyName) + '" height="34" style="display:block;border:0;outline:none;max-height:34px;">' +
        '</td>' +
        '<td style="text-align:right;vertical-align:middle;">' +
          '<img src="' + b.clientLogoUrl + '" alt="' + escapeHtml(CONFIG.clientName) + '" height="40" style="display:inline-block;border:0;outline:none;max-height:40px;">' +
        '</td>' +
      '</tr></table>' +
      '<div style="height:3px;background:' + b.orange + ';border-radius:3px;margin:16px 0 0;"></div>' +
    '</td></tr>' +

    // Titel
    '<tr><td style="padding:18px 26px 0;">' +
      '<div style="color:' + b.green + ';font-size:21px;font-weight:bold;">Google Ads maandrapportage</div>' +
      '<div style="color:' + b.muted + ';font-size:14px;margin-top:4px;">' + escapeHtml(CONFIG.clientName) + ' &middot; ' + current.label + '</div>' +
    '</td></tr>' +

    // Body
    '<tr><td style="padding:18px 26px 26px;">' +

      '<p style="margin:0 0 18px;font-size:14px;line-height:1.6;">Beste Terry,</p>' +
      '<p style="margin:0 0 22px;font-size:14px;line-height:1.6;">Hierbij een kort overzicht van de prestaties van jullie Google Ads-account over <strong>' + current.label + '</strong>, per campagne. In de totaalregel zie je de vergelijking met ' + previous.label + '.</p>' +

      // Per campagne
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:0 0 10px;">Resultaten per campagne</div>' +
      '<div style="overflow-x:auto;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid ' + b.border + ';border-radius:8px;overflow:hidden;min-width:680px;">' +
        '<tr style="background:' + b.green + ';">' +
          thd('Campagne', 'left') + thd('Kosten') + thd('Vert.') + thd('Klikken') + thd('CTR') +
          thd('Gem. CPC') + thd('Alle conv.') + thd('Conv.') + thd('Kosten/conv.') + thd('Conv.%') + thd('Zoekvert.%') +
        '</tr>' +
        campaignRows +
        totalRow +
      '</table>' +
      '</div>' +
      '<div style="font-size:11px;color:' + b.muted + ';margin-top:6px;">Zoekvertoningspercentage wordt per zoekcampagne getoond; op de totaalregel is dit niet als één getal beschikbaar.</div>' +

      // Zoekwoorden
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:28px 0 10px;">Top ' + CONFIG.keywordLimit + ' zoekwoorden (op klikken)</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid ' + b.border + ';border-radius:8px;overflow:hidden;">' +
        '<tr style="background:' + b.green + ';">' +
          thd('Zoekwoord', 'left') + thd('Vert.') + thd('Klikken') + thd('CTR') + thd('Gem. CPC') + thd('Conv.') + thd('Alle conv.') +
        '</tr>' +
        keywordRows +
      '</table>' +

      '<p style="margin:24px 0 0;font-size:13px;line-height:1.6;">Vragen over deze cijfers of ideeën om verder te groeien? Neem gerust contact met ons op.</p>' +
      '<p style="margin:14px 0 0;font-size:13px;line-height:1.6;">Met vriendelijke groet,<br><strong>' + escapeHtml(CONFIG.agencyName) + '</strong></p>' +

    '</td></tr>' +
  '</table>' +

  // Footer
  '<div style="text-align:center;color:' + b.muted + ';font-size:11px;line-height:1.6;padding:18px 10px;">' +
    escapeHtml(CONFIG.agencyName) + ' &middot; <a href="' + CONFIG.agencyUrl + '" style="color:' + b.orange + ';text-decoration:none;">seovrienden.nl</a> &middot; ' +
    '<a href="mailto:' + CONFIG.agencyEmail + '" style="color:' + b.orange + ';text-decoration:none;">' + CONFIG.agencyEmail + '</a><br>' +
    'Deze rapportage is automatisch gegenereerd vanuit Google Ads.' +
  '</div>' +

'</div></body></html>';
}

/** Cel voor de totaalregel: waarde + klein gekleurd verschil t.o.v. vorige maand. */
function totalCell(curVal, prevVal, format, key) {
  var b = CONFIG.brand;
  var change = pctChange(curVal, prevVal);
  var color = b.muted, arrow = '';

  if (change !== null && Math.abs(change) >= 0.0005) {
    var good = (change > 0) ? CONFIG.higherIsBetter[key] : !CONFIG.higherIsBetter[key];
    color = good ? b.positive : b.negative;
    arrow = (change > 0) ? '▲ ' : '▼ ';
  }
  var delta = (change === null) ? '&ndash;' : (arrow + fmtPercent(Math.abs(change)));

  return '<td style="padding:10px 10px;border-top:2px solid ' + b.green + ';text-align:right;">' +
           fmtValue(curVal, format) +
           '<div style="font-size:10px;font-weight:600;color:' + color + ';margin-top:2px;">' + delta + '</div>' +
         '</td>';
}

// ===========================================================================
//  HELPERS  -  datums
// ===========================================================================

/** Afgelopen volledige kalendermaand t.o.v. vandaag (in accounttijdzone). */
function lastMonthRange(tz) {
  var now = new Date();
  var y = Number(Utilities.formatDate(now, tz, 'yyyy'));
  var m = Number(Utilities.formatDate(now, tz, 'MM')) - 1; // 0-based maand van vandaag
  var firstThisMonth = new Date(y, m, 1);
  var start = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth() - 1, 1);
  var end   = new Date(firstThisMonth.getFullYear(), firstThisMonth.getMonth(), 0); // laatste dag vorige maand
  return makeRange(start, end, tz);
}

/** De maand vóór de gegeven range. */
function monthBefore(range, tz) {
  var start = new Date(range.startDate.getFullYear(), range.startDate.getMonth() - 1, 1);
  var end   = new Date(range.startDate.getFullYear(), range.startDate.getMonth(), 0);
  return makeRange(start, end, tz);
}

function makeRange(start, end, tz) {
  var maanden = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'];
  var label = maanden[start.getMonth()] + ' ' + start.getFullYear();
  return {
    startDate: start,
    endDate:   end,
    start:     Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
    end:       Utilities.formatDate(end, tz, 'yyyy-MM-dd'),
    label:     label.charAt(0).toUpperCase() + label.slice(1)
  };
}

// ===========================================================================
//  HELPERS  -  formatteren (Nederlandse notatie: 1.234,56)
// ===========================================================================
function micros(v) { return (Number(v) || 0) / 1000000; }

function pctChange(cur, prev) {
  if (!prev) return null; // geen basis om mee te vergelijken
  return (cur - prev) / prev;
}

function fmtValue(v, format) {
  switch (format) {
    case 'currency': return fmtCurrency(v);
    case 'percent':  return fmtPercent(v);
    case 'int':      return fmtInt(v);
    case 'decimal':  return fmtDecimal(v);
    default:         return fmtInt(v);
  }
}

function fmtInt(v)      { return groupThousands(Math.round(Number(v) || 0)); }
function fmtDecimal(v)  { return decimalsNl(Number(v) || 0, 2); }
function fmtCurrency(v) { return CONFIG.currencySymbol + ' ' + decimalsNl(Number(v) || 0, 2); }
function fmtPercent(v)  { return decimalsNl((Number(v) || 0) * 100, 2) + '%'; }

/** Getal met n decimalen in NL-notatie (punt = duizendtal, komma = decimaal). */
function decimalsNl(num, decimals) {
  var neg = num < 0;
  var fixed = Math.abs(num).toFixed(decimals);
  var parts = fixed.split('.');
  return (neg ? '-' : '') + groupThousands(parts[0]) + ',' + parts[1];
}

/** Voegt punten toe als duizendtalscheiding. */
function groupThousands(intValue) {
  var s = '' + intValue;
  var neg = s.charAt(0) === '-';
  if (neg) s = s.substring(1);
  s = s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '-' : '') + s;
}

// ===========================================================================
//  HELPERS  -  diversen
// ===========================================================================

/** Tabelkop-cel: crème tekst op donkergroen. */
function thd(text, align) {
  return '<th style="padding:10px 10px;text-align:' + (align || 'right') + ';font-size:11px;text-transform:uppercase;letter-spacing:.3px;color:' + CONFIG.brand.cream + ';font-weight:700;white-space:nowrap;">' + text + '</th>';
}

function td(content, align) {
  return '<td style="padding:8px 10px;border-top:1px solid ' + CONFIG.brand.border + ';text-align:' + (align || 'right') + ';white-space:nowrap;">' + content + '</td>';
}

function matchTypeLabel(mt) {
  switch (mt) {
    case 'EXACT':  return 'exact';
    case 'PHRASE': return 'zin';
    case 'BROAD':  return 'breed';
    default:       return (mt || '').toLowerCase();
  }
}

function currencySymbolFor(code) {
  var map = { EUR: '€', USD: '$', GBP: '£' };
  return map[code] || (code ? code + ' ' : '€');
}

function escapeHtml(s) {
  return ('' + s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
