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
  agencyName:  'SEO Vrienden',
  agencyUrl:   'https://seovrienden.nl/',
  agencyEmail: 'support@seovrienden.nl',

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
'<meta name="viewport" content="width=device-width, initial-scale=1.0"></head>' +
'<body style="margin:0;padding:0;background:' + b.bg + ';">' +
'<div style="font-family:Arial,Helvetica,sans-serif;color:' + b.text + ';max-width:760px;margin:0 auto;background:' + b.bg + ';padding:16px;">' +

  // Kaart
  '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid ' + b.border + ';">' +

    // Header: groene balk met crème wordmark + slogan, oranje accentlijn
    '<tr><td style="background:' + b.green + ';padding:22px 26px;text-align:left;">' +
      '<div style="font-family:' + b.logoFont + ';font-size:32px;font-weight:bold;color:' + b.cream + ';letter-spacing:.5px;line-height:1;">' + escapeHtml(b.logoText) + '</div>' +
      (b.tagline ? '<div style="font-family:' + b.logoFont + ';font-size:13px;color:' + b.cream + ';opacity:.9;margin-top:6px;">' + escapeHtml(b.tagline) + '</div>' : '') +
    '</td></tr>' +
    '<tr><td style="height:4px;background:' + b.orange + ';font-size:0;line-height:0;">&nbsp;</td></tr>' +

    // Titelregel met klantlogo op witte achtergrond
    '<tr><td style="padding:20px 26px 0;">' +
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
    '<tr><td style="padding:18px 26px 26px;">' +

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

  // 2) Klikken: vertoningen (zichtbaarheid) vs. CTR (aantrekkelijkheid).
  if (clicksCh !== null && Math.abs(clicksCh) >= TH) {
    var aImpr = (imprCh === null) ? 0 : Math.abs(imprCh);
    var aCtr  = (ctrCh === null) ? 0 : Math.abs(ctrCh);
    if (aImpr >= aCtr) {
      var z = 'De klikken volgden vooral het aantal vertoningen (' + signPct(imprCh) + ').';
      if (imprCh < 0 && lost && lost.budget >= 0.10) {
        z += ' Een deel van de vertoningen ging verloren door budget (gemiddeld ' +
             fmtPercent(lost.budget) + ' verloren door budget) – hier liggen groeikansen.';
      } else if (imprCh < 0 && lost && lost.rank >= 0.10) {
        z += ' De zichtbaarheid werd geremd door de advertentiepositie (gemiddeld ' +
             fmtPercent(lost.rank) + ' verloren door rangschikking).';
      }
      out.push(z);
    } else {
      out.push('De verandering in klikken kwam vooral door een ' +
               (ctrCh < 0 ? 'lagere' : 'hogere') + ' CTR (' + signPct(ctrCh) + ').');
    }
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
  // Compact formaat, op hoge resolutie (devicePixelRatio) zodat het scherp blijft.
  return 'https://quickchart.io/chart?bkg=white&w=480&h=190&devicePixelRatio=2&c=' + encodeURIComponent(JSON.stringify(chart));
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
    '<div style="border:1px solid ' + b.border + ';border-radius:8px;padding:12px;text-align:center;">' +
      '<img src="' + src + '" alt="Trend conversies en alle conversies per maand" width="480" style="width:100%;max-width:480px;height:auto;border:0;outline:none;">' +
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
