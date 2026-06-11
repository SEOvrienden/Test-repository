/**
 * ============================================================================
 *  Maandrapportage Google Ads  -  Fysiotherapie Sminia
 *  Gemaakt door SEO Vrienden (https://seovrienden.nl)
 * ----------------------------------------------------------------------------
 *  Stuurt automatisch een korte, branded HTML-mail met de accountprestaties
 *  van de afgelopen kalendermaand. De cijfers staan PER CAMPAGNE (echte data,
 *  incl. het werkelijke zoekvertoningspercentage per campagne). Onderaan staat
 *  een totaalregel met de vergelijking t.o.v. dezelfde maand vorig jaar, plus
 *  een top 20 van best presterende zoekwoorden (op klikken).
 *
 *  Plaatsen: Google Ads -> Extra & instellingen -> Bulkacties -> Scripts
 *  Frequentie: stel je zelf in bij het inplannen van het script (bv. maandelijks).
 * ============================================================================
 */

// ===========================================================================
//  INSTELLINGEN  -  pas dit blok aan en verder hoef je niets te wijzigen
// ===========================================================================
var CONFIG = {
  // --- Test / live -------------------------------------------------------
  // testMode = true  -> de mail gaat ALLEEN naar testRecipient (nooit naar de klant).
  //                     Gebruik dit om met "Voorbeeld" rustig de opmaak te checken.
  // testMode = false -> live: mail gaat naar recipient + cc + bcc.
  testMode:      true,
  testRecipient: 'support@seovrienden.nl',

  // --- Ontvangers (gebruikt zodra testMode = false) ----------------------
  recipient: 'terry.bosma@fysiosminia.nl',
  cc:        'support@seovrienden.nl',
  bcc:       '',

  // --- Klant / afzender --------------------------------------------------
  clientName:  'Fysiotherapie Sminia',
  clientUrl:   'https://www.fysiosminia.nl/',
  agencyName:  'SEO vrienden',
  agencyUrl:   'https://www.seovrienden.nl',
  agencyUrlLabel: 'www.seovrienden.nl',
  agencyEmail: 'support@seovrienden.nl',
  agencyAddr1: 'Bruynvisweg 18',
  agencyAddr2: '1531 AZ Wormer',
  agencyPhone:    '+31 (0)75 369 00 27', // weergave
  agencyPhoneTel: '+31753690027',         // voor de tel:-link

  // --- Huisstijl SEO Vrienden -------------------------------------------
  brand: {
    // Het SEO Vrienden-logo wordt als tekst-wordmark weergegeven (font Coconat,
    // crème op donkergroen), zodat er geen gehoste afbeelding nodig is.
    logoText:  'seovrienden',
    tagline:   'wij doen wat we zeggen',
    logoFont:  "'Coconat', Georgia, 'Times New Roman', serif",
    // Het klantlogo is wel een afbeelding (publiek bereikbare URL).
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
  // Filter/sortering van de zoekwoordtabel (bepaalt de output vóór verzenden;
  // interactief filteren in de mail zelf kan niet, e-mailclients blokkeren dat).
  keywordSortBy:    'clicks', // 'clicks' | 'impressions' | 'conversions'
  keywordMinClicks: 0,         // toon alleen zoekwoorden met minimaal dit aantal klikken
  trendMonths:      6,          // aantal maanden in de trendgrafiek
  // Conversies per actie: toon ALLEEN acties waarvan de naam dit bevat (hoofd-
  // letterongevoelig). Zo blijven GA4-acties buiten beeld. Leeg = alles tonen.
  conversionActionNameMustContain: 'Google Ads',
  // Conversieacties die je daarnaast NIET wilt meenemen, op exacte naam.
  excludeConversionActions: [], // bv. ['GA4 - Aankoop', 'GA4 - Formulier']
  // Onderdelen aan/uit zetten.
  show: { summary: true, insights: true, conversionsByAction: true, trend: true },
  insightThreshold: 0.05, // vanaf welk verschil (5%) een KPI in de toelichting wordt genoemd
  // Herkenning van campagnetypes (op campagnenaam, hoofdletterongevoelig) voor de
  // vergelijking Branded vs. Generiek in de toelichting.
  brandedMatch: 'branded',
  genericMatch: 'generiek',
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

  var current  = lastMonthRange(tz);             // afgelopen volledige kalendermaand
  var previous = sameMonthLastYear(current, tz);  // dezelfde maand vorig jaar (seizoensvergelijking)

  var cur  = getCampaignData(current.start, current.end);
  var prev = getCampaignData(previous.start, previous.end);
  var keywords = getTopKeywords(current.start, current.end, CONFIG.keywordLimit);
  var convActions = CONFIG.show.conversionsByAction ? getConversionsByAction(current.start, current.end) : [];
  var trend = CONFIG.show.trend ? getMonthlyTrend(current, tz, CONFIG.trendMonths) : [];

  // Afbeeldingen inline meesturen, zodat ze direct zichtbaar zijn (geen
  // "afbeeldingen weergeven"/downloaden nodig). Lukt het ophalen niet, dan
  // valt het betreffende beeld terug op de externe URL.
  var inlineImages = {};
  var inlineFlags  = { clientLogo: false, trend: false };
  try {
    inlineImages.clientlogo = UrlFetchApp.fetch(CONFIG.brand.clientLogoUrl).getBlob().setName('clientlogo');
    inlineFlags.clientLogo = true;
  } catch (e) { Logger.log('Klantlogo niet inline geladen: ' + e); }
  if (CONFIG.show.trend && trend.length) {
    try {
      inlineImages.trendchart = UrlFetchApp.fetch(trendChartUrl(trend)).getBlob().setName('trendchart');
      inlineFlags.trend = true;
    } catch (e) { Logger.log('Trendgrafiek niet inline geladen: ' + e); }
  }

  var html = buildEmail(cur, prev, keywords, convActions, trend, current, previous, inlineFlags);
  var subject = 'Google Ads maandrapportage ' + CONFIG.clientName + ' - ' + current.label;

  // In testmodus gaat de mail uitsluitend naar de testontvanger (nooit naar de klant).
  var to  = CONFIG.testMode ? CONFIG.testRecipient : CONFIG.recipient;
  var cc  = CONFIG.testMode ? '' : CONFIG.cc;
  var bcc = CONFIG.testMode ? '' : CONFIG.bcc;
  if (CONFIG.testMode) subject = '[TEST] ' + subject;

  MailApp.sendEmail({
    to:           to,
    cc:           cc || undefined,
    bcc:          bcc || undefined,
    subject:      subject,
    htmlBody:     html,
    inlineImages: inlineImages,
    name:         CONFIG.agencyName
  });

  Logger.log((CONFIG.testMode ? 'TESTMODUS - ' : 'LIVE - ') + 'Rapportage verstuurd naar: ' + to);
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
    '       metrics.search_impression_share, ' +
    '       metrics.search_budget_lost_impression_share, ' +
    '       metrics.search_rank_lost_impression_share ' +
    'FROM campaign ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "' " +
    '  AND metrics.impressions > 0';

  var list = [], byId = {};
  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var m = r.metrics;
    var isSearch = r.campaign && r.campaign.advertisingChannelType === 'SEARCH';

    var raw = {
      id:          r.campaign.id,
      name:        r.campaign.name,
      isSearch:    isSearch,
      cost:        micros(m.costMicros),
      impressions: Number(m.impressions) || 0,
      clicks:      Number(m.clicks) || 0,
      allConv:     Number(m.allConversions) || 0,
      conv:        Number(m.conversions) || 0,
      searchIs:    isSearch ? numOrNull(m.searchImpressionShare) : null, // alleen zinvol voor zoekcampagnes
      budgetLost:  isSearch ? numOrNull(m.searchBudgetLostImpressionShare) : null,
      rankLost:    isSearch ? numOrNull(m.searchRankLostImpressionShare) : null
    };
    list.push(raw);
    byId[raw.id] = raw;
  }
  return { list: list, byId: byId };
}

/** Top N zoekwoorden van de periode, gesorteerd/gefilterd volgens CONFIG. */
function getTopKeywords(startDate, endDate, limit) {
  var sortable = { clicks: 'metrics.clicks', impressions: 'metrics.impressions',
                   conversions: 'metrics.conversions' };
  var orderBy = sortable[CONFIG.keywordSortBy] || 'metrics.clicks';
  var minClicks = Number(CONFIG.keywordMinClicks) || 0;

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
    (minClicks > 0 ? '  AND metrics.clicks >= ' + minClicks + ' ' : '') +
    'ORDER BY ' + orderBy + ' DESC ' +
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

/**
 * Google Ads-conversies uitgesplitst per conversieactie (bv. telefoon, formulier).
 * Gebruikt metrics.conversions (de acties die jij als primair telt), zodat GA4-
 * conversies die niet als zodanig meetellen buiten beeld blijven. Daarnaast kun
 * je acties op naam uitsluiten via CONFIG.excludeConversionActions.
 */
function getConversionsByAction(startDate, endDate) {
  var exclude = {};
  var ex = CONFIG.excludeConversionActions || [];
  for (var e = 0; e < ex.length; e++) exclude[('' + ex[e]).toLowerCase()] = true;
  var mustContain = ('' + (CONFIG.conversionActionNameMustContain || '')).toLowerCase();

  var query =
    'SELECT segments.conversion_action_name, metrics.conversions, metrics.all_conversions ' +
    'FROM campaign ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + endDate + "'";

  var map = {};
  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var name = (r.segments && r.segments.conversionActionName) ? r.segments.conversionActionName : 'Overig';
    var lower = name.toLowerCase();
    if (exclude[lower]) continue;
    if (mustContain && lower.indexOf(mustContain) === -1) continue; // alleen Google Ads-acties
    if (!map[name]) map[name] = { name: name, conv: 0, allConv: 0 };
    map[name].conv    += Number(r.metrics.conversions) || 0;
    map[name].allConv += Number(r.metrics.allConversions) || 0;
  }

  // Toon alle metingen met activiteit (ook acties die alleen onder 'Alle conv.' vallen).
  var list = [];
  for (var k in map) {
    if (map[k].allConv > 0 || map[k].conv > 0) list.push(map[k]);
  }
  list.sort(function (a, z) { return z.allConv - a.allConv; });
  return list;
}

/** Maandelijkse kosten + conversies over de laatste n maanden (t/m de rapportagemaand). */
function getMonthlyTrend(current, tz, n) {
  var maandKort = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec'];
  var refY = current.startDate.getFullYear();
  var refM = current.startDate.getMonth();

  var months = [], byKey = {};
  for (var i = n - 1; i >= 0; i--) {
    var d = new Date(refY, refM - i, 1);
    var m = { key: Utilities.formatDate(d, tz, 'yyyy-MM'),
              label: maandKort[d.getMonth()] + " '" + ('' + d.getFullYear()).slice(2),
              conv: 0, allConv: 0 };
    months.push(m);
    byKey[m.key] = m;
  }

  var startDate = Utilities.formatDate(new Date(refY, refM - (n - 1), 1), tz, 'yyyy-MM-dd');
  var query =
    'SELECT segments.month, metrics.conversions, metrics.all_conversions ' +
    'FROM campaign ' +
    "WHERE segments.date BETWEEN '" + startDate + "' AND '" + current.end + "'";

  var rows = AdsApp.search(query);
  while (rows.hasNext()) {
    var r = rows.next();
    var mk = ('' + r.segments.month).substring(0, 7); // yyyy-MM
    if (byKey[mk]) {
      byKey[mk].conv    += Number(r.metrics.conversions) || 0;
      byKey[mk].allConv += Number(r.metrics.allConversions) || 0;
    }
  }
  return months;
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
function buildEmail(cur, prev, keywords, convActions, trend, current, previous, inlineFlags) {
  var b = CONFIG.brand;
  inlineFlags = inlineFlags || {};
  var clientLogoSrc = inlineFlags.clientLogo ? 'cid:clientlogo' : b.clientLogoUrl;

  // Totalen (huidige maand + dezelfde maand vorig jaar) - ook voor de samenvatting.
  var curTot  = derive(sumRaw(cur.list));
  var prevTot = derive(sumRaw(prev.list));

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

  // Totaalregel met vergelijking t.o.v. dezelfde maand vorig jaar.
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

  // Samenvatting in gewone taal.
  var summaryBlock = CONFIG.show.summary ?
    '<div style="background:' + b.bg + ';border-left:4px solid ' + b.orange + ';border-radius:6px;padding:14px 16px;margin:0 0 22px;font-size:14px;line-height:1.6;">' +
      buildSummary(curTot, prevTot, current, previous, convActions) +
    '</div>' : '';

  // Analyse & toelichting (verklaring uit KPI-verbanden).
  var insightsBlock = '';
  if (CONFIG.show.insights) {
    var insights = generateInsights(curTot, prevTot, weightedSearchLost(cur.list));
    var segIns = generateSegmentInsight(cur, prev);
    if (segIns) insights.push(segIns);
    insights.push(positiveTakeaway(curTot, prevTot, weightedSearchLost(cur.list)));
    insightsBlock =
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:0 0 8px;">Analyse &amp; toelichting</div>' +
      '<ul style="margin:0 0 4px;padding-left:18px;font-size:13px;line-height:1.7;">' +
        insights.map(function (t) { return '<li>' + t + '</li>'; }).join('') +
      '</ul>' +
      '<div style="font-size:11px;color:' + b.muted + ';margin:0 0 22px;">Toelichting afgeleid uit de cijfers; externe factoren (seizoen, concurrentie, wijzigingen in de campagnes, enz.) kunnen ook meespelen. Dit kan eventueel mondeling worden toegelicht.</div>';
  }

  // Conversies per actie (alle Google Ads-metingen: Conv. + Alle conv.).
  var convRowsHtml = convActions.length ? convActions.map(function (a) {
    return '<tr>' + td(escapeHtml(a.name), 'left') + td(fmtDecimal(a.conv)) + td(fmtDecimal(a.allConv)) + '</tr>';
  }).join('') :
  '<tr><td colspan="3" style="padding:14px;text-align:center;color:' + b.muted + ';">Geen conversies in deze periode.</td></tr>';

  var convBlock = CONFIG.show.conversionsByAction ?
    '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:28px 0 10px;">Conversies per actie</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid ' + b.border + ';border-radius:8px;overflow:hidden;">' +
      '<tr style="background:' + b.green + ';">' + thd('Conversieactie', 'left') + thd('Conv.') + thd('Alle conv.') + '</tr>' +
      convRowsHtml +
    '</table>' : '';

  // 6-maanden trend (visuele lijngrafiek).
  var trendBlock = (CONFIG.show.trend && trend.length) ? buildTrend(trend, inlineFlags.trend) : '';

  return '' +
'<!DOCTYPE html><html><head><meta charset="utf-8">' +
'<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'<style>@media only screen and (max-width:600px){' +
'.wrap{padding:8px !important;}' +
'.px{padding-left:16px !important;padding-right:16px !important;}' +
'}</style>' +
'</head>' +
'<body style="margin:0;padding:0;background:' + b.bg + ';">' +
'<div class="wrap" style="font-family:Arial,Helvetica,sans-serif;color:' + b.text + ';max-width:760px;margin:0 auto;background:' + b.bg + ';padding:16px;">' +

  // Kaart
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ' + b.border + ';">' +

    // Header: groene balk met crème wordmark + slogan, oranje accentlijn
    '<tr><td class="px" style="background:' + b.green + ';padding:22px 26px;text-align:left;">' +
      '<div style="font-family:' + b.logoFont + ';font-size:32px;font-weight:bold;color:' + b.cream + ';letter-spacing:.5px;line-height:1;">' + escapeHtml(b.logoText) + '</div>' +
      (b.tagline ? '<div style="font-family:' + b.logoFont + ';font-size:13px;color:' + b.cream + ';opacity:.9;margin-top:6px;">' + escapeHtml(b.tagline) + '</div>' : '') +
    '</td></tr>' +
    '<tr><td style="height:4px;background:' + b.orange + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +

    // Titelregel met klantlogo op witte achtergrond
    '<tr><td class="px" style="padding:20px 26px 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>' +
        '<td style="vertical-align:middle;">' +
          '<div style="color:' + b.green + ';font-size:21px;font-weight:bold;">Google Ads maandrapportage</div>' +
          '<div style="color:' + b.muted + ';font-size:14px;margin-top:4px;">' + escapeHtml(CONFIG.clientName) + ' &middot; ' + current.label + '</div>' +
        '</td>' +
        '<td style="vertical-align:middle;text-align:right;width:140px;">' +
          '<img src="' + clientLogoSrc + '" alt="' + escapeHtml(CONFIG.clientName) + '" style="display:inline-block;border:0;outline:none;max-height:58px;max-width:140px;">' +
        '</td>' +
      '</tr></table>' +
    '</td></tr>' +

    // Body
    '<tr><td class="px" style="padding:18px 26px 26px;">' +

      '<p style="margin:0 0 18px;font-size:14px;line-height:1.6;">Beste Terry,</p>' +
      '<p style="margin:0 0 22px;font-size:14px;line-height:1.6;">Hierbij een kort overzicht van de prestaties van jullie Google Ads-account over <strong>' + current.label + '</strong>, per campagne. In de totaalregel zie je de vergelijking met dezelfde maand vorig jaar (' + previous.label + ').</p>' +

      summaryBlock +
      insightsBlock +

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

      convBlock +
      trendBlock +

      // Zoekwoorden
      '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:28px 0 10px;">Top ' + CONFIG.keywordLimit + ' zoekwoorden (op klikken)</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:12px;border:1px solid ' + b.border + ';border-radius:8px;overflow:hidden;">' +
        '<tr style="background:' + b.green + ';">' +
          thd('Zoekwoord', 'left') + thd('Vert.') + thd('Klikken') + thd('CTR') + thd('Gem. CPC') + thd('Conv.') + thd('Alle conv.') +
        '</tr>' +
        keywordRows +
      '</table>' +

      '<p style="margin:24px 0 0;font-size:13px;line-height:1.6;">Vragen over deze cijfers of mis je iets? Neem gerust contact met ons op.</p>' +
      '<p style="margin:18px 0 6px;font-size:13px;line-height:1.6;">Met vriendelijke groet,</p>' +
      '<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="font-size:13px;line-height:1.7;color:' + b.text + ';">' +
        '<strong style="color:' + b.green + ';">' + escapeHtml(CONFIG.agencyName) + '</strong><br>' +
        escapeHtml(CONFIG.agencyAddr1) + '<br>' + escapeHtml(CONFIG.agencyAddr2) + '<br>' +
        '<span style="color:' + b.muted + ';">T:</span> <a href="tel:' + CONFIG.agencyPhoneTel + '" style="color:' + b.orange + ';text-decoration:none;">' + escapeHtml(CONFIG.agencyPhone) + '</a><br>' +
        '<span style="color:' + b.muted + ';">E:</span> <a href="mailto:' + CONFIG.agencyEmail + '" style="color:' + b.orange + ';text-decoration:none;">' + escapeHtml(CONFIG.agencyEmail) + '</a><br>' +
        '<span style="color:' + b.muted + ';">I:</span> <a href="' + CONFIG.agencyUrl + '" style="color:' + b.orange + ';text-decoration:none;">' + escapeHtml(CONFIG.agencyUrlLabel) + '</a>' +
      '</td></tr></table>' +

    '</td></tr>' +
  '</table>' +

  // Footer
  '<div style="text-align:center;color:' + b.muted + ';font-size:11px;line-height:1.6;padding:18px 10px;">' +
    escapeHtml(CONFIG.agencyName) + ' &middot; <a href="' + CONFIG.agencyUrl + '" style="color:' + b.orange + ';text-decoration:none;">' + escapeHtml(CONFIG.agencyUrlLabel) + '</a> &middot; ' +
    '<a href="mailto:' + CONFIG.agencyEmail + '" style="color:' + b.orange + ';text-decoration:none;">' + CONFIG.agencyEmail + '</a><br>' +
    'Deze rapportage is automatisch gegenereerd vanuit Google Ads.' +
  '</div>' +

'</div></body></html>';
}

/** Cel voor de totaalregel: waarde + klein gekleurd verschil t.o.v. vorig jaar. */
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

/** Samenvatting in gewone taal op basis van de maandtotalen. */
function buildSummary(curTot, prevTot, current, previous, convActions) {
  var maandNu  = lowerFirst(current.label);
  var maandVor = lowerFirst(previous.label);
  var change = pctChange(curTot.conv, prevTot.conv);

  var s1 = 'In ' + maandNu + ' leverde Google Ads <strong>' + fmtDecimal(curTot.conv) + ' conversies</strong> op' +
           (curTot.conv ? ' tegen <strong>' + fmtCurrency(curTot.costPerConv) + '</strong> per conversie' : '') + '.';

  var s2 = '';
  if (change !== null) {
    if (change > 0.0005)       s2 = ' Dat is <strong>' + fmtPercent(change) + ' meer</strong> dan in ' + maandVor + '.';
    else if (change < -0.0005) s2 = ' Dat is <strong>' + fmtPercent(-change) + ' minder</strong> dan in ' + maandVor + '.';
    else                       s2 = ' Dat is vergelijkbaar met ' + maandVor + '.';
  }

  // Benoem om wat voor conversies het gaat (de gemeten conversieacties).
  var names = [];
  var acts = convActions || [];
  for (var i = 0; i < acts.length && names.length < 6; i++) {
    if (acts[i].conv > 0) names.push(acts[i].name);
  }
  var s4 = names.length ? ' Deze conversies bestaan uit: ' + joinNl(names) + '.' :
           (curTot.conv ? ' Dit zijn de gemeten Google Ads-conversies.' : '');

  var s3 = ' Er werd ' + fmtCurrency(curTot.cost) + ' geïnvesteerd, goed voor ' +
           fmtInt(curTot.clicks) + ' klikken (CTR ' + fmtPercent(curTot.ctr) + ').';

  return s1 + s2 + s4 + s3;
}

/** Impressie-gewogen verloren zoekvertoningspercentage (budget/rang) over zoekcampagnes. */
function weightedSearchLost(list) {
  var wB = 0, wR = 0, imp = 0;
  for (var i = 0; i < list.length; i++) {
    var c = list[i];
    if (c.isSearch && c.impressions > 0) {
      if (c.budgetLost !== null) wB += c.budgetLost * c.impressions;
      if (c.rankLost   !== null) wR += c.rankLost   * c.impressions;
      imp += c.impressions;
    }
  }
  return imp ? { budget: wB / imp, rank: wR / imp } : { budget: 0, rank: 0 };
}

/**
 * Leidt een verklarende toelichting af uit de KPI-verbanden.
 * Verklaart het mechanisme (bv. minder klikken vs. lager conversiepercentage),
 * niet de externe oorzaak. Geeft een lijst zinnen terug.
 */
function generateInsights(curTot, prevTot, lost) {
  var TH = Number(CONFIG.insightThreshold) || 0.05;
  var out = [];

  var costCh     = pctChange(curTot.cost,        prevTot.cost);
  var convCh     = pctChange(curTot.conv,        prevTot.conv);
  var clicksCh   = pctChange(curTot.clicks,      prevTot.clicks);
  var ctrCh      = pctChange(curTot.ctr,         prevTot.ctr);
  var imprCh     = pctChange(curTot.impressions, prevTot.impressions);
  var cpcCh      = pctChange(curTot.avgCpc,      prevTot.avgCpc);
  var convRateCh = pctChange(curTot.convRate,    prevTot.convRate);
  var cpaCh      = pctChange(curTot.costPerConv, prevTot.costPerConv);

  // 0) Kosten: altijd vermelden (vergelijking met dezelfde maand vorig jaar).
  if (costCh !== null) {
    var kostenTxt = (Math.abs(costCh) < 0.005)
      ? 'bleven vrijwel gelijk op ' + fmtCurrency(curTot.cost)
      : (costCh < 0 ? 'daalden' : 'stegen') + ' met ' + fmtPercent(Math.abs(costCh)) +
        ' naar ' + fmtCurrency(curTot.cost) + ' (was ' + fmtCurrency(prevTot.cost) + ')';
    out.push('De advertentiekosten ' + kostenTxt + '.');
  } else {
    out.push('De advertentiekosten bedroegen ' + fmtCurrency(curTot.cost) +
             ' (geen vergelijkbare data van vorig jaar).');
  }

  // 1) Conversies: verkeer (klikken) vs. rendement (conversiepercentage).
  if (convCh !== null && Math.abs(convCh) >= TH) {
    var aClicks = (clicksCh === null) ? 0 : Math.abs(clicksCh);
    var aRate   = (convRateCh === null) ? 0 : Math.abs(convRateCh);
    var driver = (aClicks >= aRate)
      ? 'vooral door ' + (clicksCh < 0 ? 'minder' : 'meer') + ' klikken (' + signPct(clicksCh) + ')'
      : 'vooral door een ' + (convRateCh < 0 ? 'lager' : 'hoger') + ' conversiepercentage (' + signPct(convRateCh) + ')';
    out.push('Het aantal conversies ' + (convCh < 0 ? 'daalde' : 'steeg') + ' met ' +
             fmtPercent(Math.abs(convCh)) + ', ' + driver + '.');
  }

  // 1b) Primaire vs. secundaire conversies (verschuiving in type actie).
  var secCur = curTot.allConv - curTot.conv, secPrev = prevTot.allConv - prevTot.conv;
  var priCh = pctChange(curTot.conv, prevTot.conv);
  var secCh = pctChange(secCur, secPrev);
  if (priCh !== null && secCh !== null && (secCur + secPrev) > 0) {
    var priSign = priCh > 0.005 ? 1 : (priCh < -0.005 ? -1 : 0);
    var secSign = secCh > 0.005 ? 1 : (secCh < -0.005 ? -1 : 0);
    var notable = Math.max(Math.abs(priCh), Math.abs(secCh)) >= TH;
    if (priSign !== 0 && secSign !== 0 && priSign !== secSign && notable) {
      var zin1b = 'De primaire conversies ' + devText(curTot.conv, prevTot.conv) +
                  ', terwijl de secundaire conversies (zoals telefoon- of mailklikken) ' + devText(secCur, secPrev) + '.';
      if (secSign > 0 && priSign < 0) zin1b += ' Bezoekers kozen dus vaker voor direct contact (bv. bellen) dan voor het formulier.';
      else                            zin1b += ' Bezoekers vulden dus vaker het formulier in dan dat ze direct contact zochten.';
      out.push(zin1b);
    }
  }

  // 2) Klikken: vertoningen (zichtbaarheid) vs. CTR (aantrekkelijkheid).
  if (clicksCh !== null && Math.abs(clicksCh) >= TH) {
    var aImpr = (imprCh === null) ? 0 : Math.abs(imprCh);
    var aCtr  = (ctrCh === null) ? 0 : Math.abs(ctrCh);
    var z;
    if (aImpr >= aCtr) {
      z = 'De klikken volgden vooral het aantal vertoningen (' + signPct(imprCh) + ').';
      if (imprCh < 0 && lost && lost.budget >= 0.10) {
        z += ' Een deel van de vertoningen ging verloren door budget (gemiddeld ' +
             fmtPercent(lost.budget) + ' verloren door budget) – hier liggen groeikansen.';
      } else if (imprCh < 0 && lost && lost.rank >= 0.10) {
        z += ' De zichtbaarheid werd geremd door de advertentiepositie (gemiddeld ' +
             fmtPercent(lost.rank) + ' verloren door rangschikking).';
      }
    } else {
      z = 'De verandering in klikken kwam vooral door een ' +
          (ctrCh < 0 ? 'lagere' : 'hogere') + ' CTR (' + signPct(ctrCh) + ').';
    }
    // Budget-mechanica: een hogere CPC levert bij gelijk budget minder klikken op.
    if (clicksCh < 0 && cpcCh !== null && cpcCh > TH) {
      z += ' Daarnaast leverde de hogere gem. CPC (' + signPct(cpcCh) + ') minder klikken per euro op.';
    }
    out.push(z);
  }

  // 3) Kosten per conversie = gem. CPC / conversiepercentage.
  //    CPC omhoog -> CPA omhoog ; conversiepercentage omhoog -> CPA omlaag.
  //    We scheiden factoren die in dezelfde richting duwen (oorzaak) van factoren
  //    die juist tegenwerken (dempend), zodat de uitleg klopt.
  if (cpaCh !== null && Math.abs(cpaCh) >= TH) {
    var up = cpaCh > 0;
    var drivers = [], counters = [];

    if (cpcCh !== null && Math.abs(cpcCh) >= TH) {
      var cpcUp = cpcCh > 0; // hogere CPC duwt CPA omhoog
      if (cpcUp === up) drivers.push('de gem. CPC ' + (cpcUp ? 'steeg' : 'daalde') + ' (' + signPct(cpcCh) + ')');
      else              counters.push('de ' + (cpcUp ? 'hogere' : 'lagere') + ' gem. CPC (' + signPct(cpcCh) + ')');
    }
    if (convRateCh !== null && Math.abs(convRateCh) >= TH) {
      var cvrUp = convRateCh > 0;     // hoger conversiepercentage duwt CPA omlaag
      var cvrPushesUp = !cvrUp;       // dus CPA-richting is omgekeerd aan het percentage
      if (cvrPushesUp === up) drivers.push('het conversiepercentage ' + (cvrUp ? 'steeg' : 'daalde') + ' (' + signPct(convRateCh) + ')');
      else                    counters.push('het ' + (cvrUp ? 'hogere' : 'lagere') + ' conversiepercentage (' + signPct(convRateCh) + ')');
    }

    var s = 'De kosten per conversie ' + (up ? 'stegen' : 'daalden') + ' met ' + fmtPercent(Math.abs(cpaCh));
    if (drivers.length) s += ', doordat ' + joinNl(drivers);
    s += '.';
    if (counters.length) s += ' ' + capFirst(joinNl(counters)) + ' ' + (counters.length > 1 ? 'temperden' : 'temperde') + ' dit deels.';
    out.push(s);
  }

  if (!out.length) {
    out.push('De prestaties waren stabiel ten opzichte van dezelfde maand vorig jaar; geen opvallende verschuivingen.');
  }
  return out;
}

/**
 * Sluit de analyse af met een eerlijke, positieve boodschap: de écht positieve
 * ontwikkelingen onder elkaar. Is er niets positiefs, dan een constructieve kans
 * (geen verzonnen positiviteit). Eén korte slotzin.
 */
function positiveTakeaway(curTot, prevTot, lost) {
  var TH = Number(CONFIG.insightThreshold) || 0.05;
  var pos = [], c;
  function up(a, b)   { var x = pctChange(a, b); return (x !== null && x > 0.005)  ? x : null; }
  function down(a, b) { var x = pctChange(a, b); return (x !== null && x < -0.005) ? x : null; }

  if ((c = up(curTot.conv, prevTot.conv))            !== null) pos.push('meer conversies (' + signPct(c) + ')');
  if ((c = down(curTot.costPerConv, prevTot.costPerConv)) !== null) pos.push('een lagere kosten per conversie (' + signPct(c) + ')');
  if ((c = up(curTot.convRate, prevTot.convRate))    !== null) pos.push('een hoger conversiepercentage (' + signPct(c) + ')');
  if ((c = up(curTot.ctr, prevTot.ctr))              !== null) pos.push('een hogere CTR (' + signPct(c) + ')');
  if ((c = down(curTot.avgCpc, prevTot.avgCpc))      !== null) pos.push('een lagere klikprijs (' + signPct(c) + ')');
  if ((c = up(curTot.allConv, prevTot.allConv))      !== null) pos.push('meer totale conversies (' + signPct(c) + ')');
  // Lagere uitgaven alleen als pluspunt als de efficiëntie (kosten/conv.) niet verslechterde.
  var cpaChk = pctChange(curTot.costPerConv, prevTot.costPerConv);
  if ((c = down(curTot.cost, prevTot.cost)) !== null && (cpaChk === null || cpaChk <= 0.005)) pos.push('beheerste uitgaven (' + signPct(c) + ')');

  if (pos.length) {
    return 'Onder de streep: positief is ' + joinNl(pos.slice(0, 3)) + '. Daar bouwen we op voort.';
  }

  // Geen directe pluspunten: benoem de grootste, concreet aanpakbare kans.
  var convRateCh = pctChange(curTot.convRate, prevTot.convRate);
  var ctrCh      = pctChange(curTot.ctr, prevTot.ctr);
  var cpcCh      = pctChange(curTot.avgCpc, prevTot.avgCpc);
  var cand = [
    { m: (convRateCh !== null && convRateCh < -TH) ? Math.abs(convRateCh) : 0, txt: 'het verhogen van het conversiepercentage (landingspagina en aanbod)' },
    { m: (ctrCh !== null && ctrCh < -TH) ? Math.abs(ctrCh) : 0,               txt: 'relevantere advertenties voor een hogere CTR' },
    { m: (cpcCh !== null && cpcCh > TH) ? Math.abs(cpcCh) : 0,                txt: 'het beheersen van de klikprijs (CPC)' },
    { m: (lost && lost.budget >= 0.10) ? lost.budget : 0,                     txt: 'meer budget voor de best presterende campagnes' }
  ];
  var best = { m: 0, txt: 'het verder opschalen van wat het beste werkt' };
  for (var i = 0; i < cand.length; i++) if (cand[i].m > best.m) best = cand[i];

  return 'Onder de streep: de cijfers liggen onder vorig jaar, maar de grootste kans ligt duidelijk in ' +
         best.txt + '. Daar gaan we de komende periode gericht op sturen.';
}

/** Som van conversies van campagnes waarvan de naam 'match' bevat. */
function sumConvMatch(list, match) {
  var s = 0;
  for (var i = 0; i < list.length; i++) {
    if (('' + list[i].name).toLowerCase().indexOf(match) !== -1) s += list[i].conv;
  }
  return s;
}

/** Ontwikkelingstekst voor conversies (jaar-op-jaar), met afhandeling van nul-basis. */
function devText(curV, prevV, th) {
  th = th || 0.005;
  var ch = pctChange(curV, prevV);
  if (ch === null) return (prevV === 0 && curV > 0) ? 'kwamen nieuw op gang' : 'bleven gelijk';
  if (ch > th)  return 'stegen (' + signPct(ch) + ')';
  if (ch < -th) return 'daalden (' + signPct(ch) + ')';
  return 'bleven vrijwel gelijk (' + signPct(ch) + ')';
}

/**
 * Benoemt een relevant verschil in ontwikkeling tussen Generieke en Branded
 * campagnes (jaar-op-jaar), ook al staat de detailvergelijking alleen op totaal.
 * Geeft null terug als er geen opvallend verschil is.
 */
function generateSegmentInsight(cur, prev) {
  var TH = Number(CONFIG.insightThreshold) || 0.05;
  var bm = ('' + (CONFIG.brandedMatch || 'branded')).toLowerCase();
  var gm = ('' + (CONFIG.genericMatch || 'generiek')).toLowerCase();

  var bCur = sumConvMatch(cur.list, bm), bPrev = sumConvMatch(prev.list, bm);
  var gCur = sumConvMatch(cur.list, gm), gPrev = sumConvMatch(prev.list, gm);
  if ((bCur + bPrev) <= 0 || (gCur + gPrev) <= 0) return null; // beide types nodig

  var bCh = pctChange(bCur, bPrev), gCh = pctChange(gCur, gPrev);
  function sign(ch, curV, prevV) {
    if (ch === null) return curV > prevV ? 1 : (curV < prevV ? -1 : 0);
    return ch > TH ? 1 : (ch < -TH ? -1 : 0);
  }
  function mag(ch, curV, prevV) { return ch === null ? (curV !== prevV ? 1 : 0) : Math.abs(ch); }
  var bSign = sign(bCh, bCur, bPrev), gSign = sign(gCh, gCur, gPrev);
  var bMag = mag(bCh, bCur, bPrev), gMag = mag(gCh, gCur, gPrev);
  var diff = Math.abs((gCh == null ? 0 : gCh) - (bCh == null ? 0 : bCh));

  // Alleen melden als de typen meetbaar anders bewegen.
  if (bSign === gSign && diff < TH) return null;
  if (Math.max(bMag, gMag) < TH && diff < TH) return null;

  // Kostencontext (totaal) als nuance.
  var costCh = pctChange(sumCost(cur.list), sumCost(prev.list));
  var costClause = (costCh !== null && costCh < -TH)
    ? ', zeker met de iets lagere advertentie-uitgaven (' + signPct(costCh) + ')' : '';

  var zin = 'Verschil per type: de generieke conversies ' + devText(gCur, gPrev, TH) +
            ', terwijl branded ' + devText(bCur, bPrev, TH) + '.';

  if (gSign >= 0 && bSign < 0) {
    zin += (gSign > 0
      ? ' Positief: generiek groeide en de daling zat vooral bij branded'
      : ' Positief: de daling zat vooral bij branded, terwijl generiek op peil bleef') +
      costClause + '. Branded zijn vaak bestaande klanten; generiek trekt juist nieuwe klanten aan.';
  } else if (gSign < 0 && bSign < 0) {
    if (gMag + 0.0001 < bMag) zin += ' De daling zat vooral bij branded; generiek hield relatief beter stand' + costClause + '.';
    else if (bMag + 0.0001 < gMag) zin += ' De daling zat vooral bij generiek; branded hield relatief beter stand.';
  } else if (gSign < 0 && bSign >= 0) {
    zin += ' De conversies kwamen daarmee vooral uit merkverkeer (branded).';
  } else if (gSign > 0 && bSign > 0) {
    zin += (gMag >= bMag
      ? ' De groei kwam vooral uit generiek, wat duidt op nieuwe klanten.'
      : ' De groei kwam vooral uit branded.');
  } else if (gSign > 0 && bSign === 0) {
    zin += ' Vooral generiek groeide, wat duidt op nieuwe klanten.';
  }
  return zin;
}

/** Som van de kosten van een campagnelijst. */
function sumCost(list) {
  var s = 0;
  for (var i = 0; i < list.length; i++) s += list[i].cost || 0;
  return s;
}

/** Bouwt de QuickChart-URL voor de trendlijngrafiek (Conversies + Alle conversies). */
function trendChartUrl(trend) {
  var b = CONFIG.brand;
  var chart = {
    type: 'line',
    data: {
      labels: trend.map(function (m) { return m.label; }),
      datasets: [
        { label: 'Conversies',      data: trend.map(function (m) { return round2(m.conv); }),    borderColor: b.green,  backgroundColor: b.green,  fill: false, borderWidth: 2, lineTension: 0.3, pointRadius: 2, pointBackgroundColor: b.green },
        { label: 'Alle conversies', data: trend.map(function (m) { return round2(m.allConv); }), borderColor: b.orange, backgroundColor: b.orange, fill: false, borderWidth: 2, lineTension: 0.3, pointRadius: 2, pointBackgroundColor: b.orange }
      ]
    },
    options: {
      legend: { position: 'bottom', labels: { fontSize: 11, boxWidth: 12 } },
      scales: { yAxes: [{ ticks: { beginAtZero: true, fontSize: 10 } }], xAxes: [{ ticks: { fontSize: 10 } }] }
    }
  };
  // Volle breedte (uitgelijnd met de tabellen), op hoge resolutie zodat het scherp blijft.
  return 'https://quickchart.io/chart?bkg=white&w=720&h=280&devicePixelRatio=2&c=' + encodeURIComponent(JSON.stringify(chart));
}

/**
 * Trend als visuele lijngrafiek (Conversies + Alle conversies per maand).
 * Bij voorkeur inline meegestuurd (src = cid:trendchart) zodat de grafiek direct
 * zichtbaar is; anders valt 'ie terug op de externe QuickChart-URL.
 */
function buildTrend(trend, useCid) {
  var b = CONFIG.brand;
  var src = useCid ? 'cid:trendchart' : trendChartUrl(trend);

  return '<div style="font-size:13px;font-weight:bold;text-transform:uppercase;letter-spacing:.5px;color:' + b.orange + ';margin:28px 0 10px;">Trend laatste ' + trend.length + ' maanden</div>' +
    '<div style="border:1px solid ' + b.border + ';border-radius:8px;padding:12px;">' +
      '<img src="' + src + '" alt="Trend conversies en alle conversies per maand" width="720" style="display:block;width:100%;height:auto;border:0;outline:none;">' +
    '</div>';
}

/** Afronden op 2 decimalen voor de grafiekdata. */
function round2(v) { return Math.round((Number(v) || 0) * 100) / 100; }

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

/** Dezelfde kalendermaand, maar één jaar eerder (seizoensvergelijking). */
function sameMonthLastYear(range, tz) {
  var start = new Date(range.startDate.getFullYear() - 1, range.startDate.getMonth(), 1);
  var end   = new Date(range.startDate.getFullYear() - 1, range.startDate.getMonth() + 1, 0);
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

function lowerFirst(s) {
  return ('' + s).charAt(0).toLowerCase() + ('' + s).slice(1);
}

/** Eerste letter een hoofdletter. */
function capFirst(s) {
  return ('' + s).charAt(0).toUpperCase() + ('' + s).slice(1);
}

/** Voegt een lijst samen als "a, b en c". */
function joinNl(arr) {
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  return arr.slice(0, -1).join(', ') + ' en ' + arr[arr.length - 1];
}

/** Getal of null als de waarde ontbreekt. */
function numOrNull(v) {
  return (v === undefined || v === null) ? null : Number(v);
}

/** Percentage met expliciet teken, bv. "+5,0%" of "-12,3%". */
function signPct(x) {
  if (x === null) return '–';
  return (x < 0 ? '-' : '+') + fmtPercent(Math.abs(x));
}

function escapeHtml(s) {
  return ('' + s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
