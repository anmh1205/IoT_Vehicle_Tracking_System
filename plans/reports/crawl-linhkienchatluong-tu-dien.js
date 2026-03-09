const fs = require('node:fs/promises');
const path = require('node:path');

const BASE_URL = 'https://linhkienchatluong.vn';
const CATEGORY_PATH = '/tu-dien_s406.aspx';
const CATEGORY_URL = `${BASE_URL}${CATEGORY_PATH}`;
const TARGET_MAX_PAGES = 26;
const DETAIL_CONCURRENCY = 4;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36';

const OUTPUT_CSV_PATH = path.resolve(
  __dirname,
  'linhkienchatluong-tu-dien-full-26-trang-chi-tiet.csv'
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(text) {
  if (!text) return '';

  return text
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, dec) => {
      const code = Number(dec);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      const code = parseInt(hex, 16);
      return Number.isFinite(code) ? String.fromCharCode(code) : _;
    });
}

function cleanText(text) {
  return decodeHtml(String(text || ''))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForMatch(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
}

function unique(values) {
  const out = [];
  for (const value of values) {
    const item = cleanText(value);
    if (!item) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

function uniqueByNormalized(values) {
  const out = [];
  const seen = new Set();

  for (const value of values) {
    const item = cleanText(value);
    if (!item) continue;

    const key = normalizeForMatch(item).replace(/\s+/g, '');
    if (seen.has(key)) continue;

    seen.add(key);
    out.push(item);
  }

  return out;
}

function normalizeCompactToken(token) {
  return String(token || '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

function toAbsoluteUrl(url) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  try {
    return new URL(url, BASE_URL).href;
  } catch {
    return url;
  }
}

function csvEscape(value) {
  const str = value === undefined || value === null ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function parsePriceVnd(priceText) {
  const digits = String(priceText || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return Number(digits);
}

function getAttr(tag, attrName) {
  if (!tag) return '';

  const quoted = tag.match(new RegExp(`${attrName}\\s*=\\s*["']([^"']*)["']`, 'i'));
  if (quoted) return decodeHtml(quoted[1]);

  const unquoted = tag.match(new RegExp(`${attrName}\\s*=\\s*([^\\s>]+)`, 'i'));
  if (unquoted) return decodeHtml(unquoted[1]);

  return '';
}

function extractHiddenFields(html) {
  const fields = {};
  const hiddenTagRegex = /<input[^>]*type=["']hidden["'][^>]*>/gi;
  const tags = html.match(hiddenTagRegex) || [];

  for (const tag of tags) {
    const name = getAttr(tag, 'name');
    if (!name) continue;
    fields[name] = getAttr(tag, 'value');
  }

  return fields;
}

function extractTotalPages(html) {
  const finalPageMatch = html.match(
    /__doPostBack\('Control1\$ctl00\$ctl00\$CollectionPager1','(\d+)'\)">Cuối cùng<\/a>/i
  );
  if (finalPageMatch) return Number(finalPageMatch[1]);

  const allPagerMatches = [
    ...html.matchAll(/__doPostBack\('Control1\$ctl00\$ctl00\$CollectionPager1','(\d+)'\)/gi),
  ];

  if (!allPagerMatches.length) return 1;
  return Math.max(...allPagerMatches.map((m) => Number(m[1]) || 1));
}

function extractProductsFromListPage(html, pageNumber) {
  const listSectionMatch = html.match(/<div class="prod_fr">([\s\S]*?)<div class="pager"/i);
  const listSection = listSectionMatch ? listSectionMatch[1] : html;

  const products = [];
  const blockRegex =
    /<div class="prod">([\s\S]*?)<div class="link-detail Destop">[\s\S]*?<\/div>\s*<\/div>/gi;

  let match;
  while ((match = blockRegex.exec(listSection)) !== null) {
    const block = match[1];

    const titleAnchorMatch = block.match(
      /<h3>\s*<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*<\/h3>/i
    );

    const detailHref = titleAnchorMatch ? titleAnchorMatch[1] : '';
    const name = titleAnchorMatch ? cleanText(titleAnchorMatch[2]) : '';

    const priceMatch = block.match(/<p class="price">\s*([\s\S]*?)\s*<span/i);
    const priceText = priceMatch ? cleanText(priceMatch[1]) : '';

    const imgTagMatch = block.match(/<img[^>]*>/i);
    const imgTag = imgTagMatch ? imgTagMatch[0] : '';
    const imageRel = getAttr(imgTag, 'data-lazy-src') || getAttr(imgTag, 'src');

    const productUrl = toAbsoluteUrl(detailHref);
    const spCtMatch = productUrl.match(/_sp(\d+)_ct(\d+)\.aspx/i);

    products.push({
      page: pageNumber,
      ten_san_pham_list: name,
      gia_list_text: priceText,
      gia_list_vnd: parsePriceVnd(priceText),
      url_chi_tiet: productUrl,
      image_list_url: toAbsoluteUrl(imageRel),
      sp_group_id_tu_url: spCtMatch ? spCtMatch[1] : '',
      ct_product_id_tu_url: spCtMatch ? spCtMatch[2] : '',
    });
  }

  return products;
}

function extractDetailField(html, regex) {
  const match = html.match(regex);
  return match ? cleanText(match[1]) : '';
}

function extractBreadcrumbs(html) {
  const matches = [
    ...html.matchAll(/<span>\s*<a href="\/[^"<>]*_s\d+\.aspx">([\s\S]*?)<\/a>\s*<\/span>/gi),
  ];

  return matches.map((m) => cleanText(m[1])).filter(Boolean);
}

function extractDetailData(html) {
  const nameDetail = extractDetailField(html, /<div class="ptitle" id="Name">\s*([\s\S]*?)\s*<\/div>/i);

  const maSanPham = extractDetailField(
    html,
    /Mã sản phẩm:\s*<span[^>]*id=["']Masp["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i
  );

  const giaChuaVatText = extractDetailField(
    html,
    /<span[^>]*id=["']giaban["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i
  );

  const giaVatText = extractDetailField(
    html,
    /<span[^>]*id=["']giabans["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i
  );

  const tinhTrang = extractDetailField(
    html,
    /<span[^>]*class=["'][^"']*tinhtrang[^"']*["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i
  );

  const donViTinh = extractDetailField(
    html,
    /Đơn vị tính:\s*<span[^>]*id=["']Donvitinh["'][^>]*>\s*([\s\S]*?)\s*<\/span>/i
  );

  const thuongHieu = extractDetailField(
    html,
    /<div[^>]*id=["']origin-info["'][^>]*>[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i
  );

  const xuatXu = extractDetailField(
    html,
    /<div[^>]*id=["']origin_xuatxu_info["'][^>]*>[\s\S]*?<a[^>]*>\s*([\s\S]*?)\s*<\/a>/i
  );

  const viTriKho = extractDetailField(html, /<div class="prdid">\s*Vị trí:\s*([\s\S]*?)\s*<\/div>/i);

  const imageMainRel = extractDetailField(
    html,
    /<div class="sp-wrap">[\s\S]*?<a[^>]*href=["']([^"']+)["'][^>]*>/i
  );

  const breadcrumbs = extractBreadcrumbs(html);

  return {
    ten_san_pham_detail: nameDetail,
    ma_san_pham: maSanPham,
    gia_chua_vat_text: giaChuaVatText,
    gia_chua_vat_vnd: parsePriceVnd(giaChuaVatText),
    gia_vat_text: giaVatText,
    gia_vat_vnd: parsePriceVnd(giaVatText),
    tinh_trang: tinhTrang,
    don_vi_tinh: donViTinh,
    thuong_hieu: thuongHieu,
    xuat_xu: xuatXu,
    vi_tri_kho: viTriKho,
    danh_muc_1: breadcrumbs[0] || '',
    danh_muc_2: breadcrumbs[1] || '',
    image_detail_url: toAbsoluteUrl(imageMainRel),
  };
}

function detectLoaiTu(nameNormalized) {
  const rules = [
    { regex: /\btu chong set\b.*\bvaristor\b/, value: 'Tụ chống sét varistor' },
    { regex: /\btu chong set\b/, value: 'Tụ chống sét' },
    { regex: /\btu cbb\b/, value: 'Tụ CBB' },
    { regex: /\btu nhom\b/, value: 'Tụ nhôm' },
    { regex: /\btu dan\b/, value: 'Tụ dán' },
    { regex: /\btu gom\b/, value: 'Tụ gốm' },
    { regex: /\btu cao ap\b/, value: 'Tụ cao áp' },
    { regex: /\btu tantal\w*\b/, value: 'Tụ tantalum' },
    { regex: /\btu loc nguon\b/, value: 'Tụ lọc nguồn' },
    { regex: /\btu bep tu\b/, value: 'Tụ bếp từ' },
    { regex: /\btu quat\b/, value: 'Tụ quạt' },
  ];

  const match = rules.find((rule) => rule.regex.test(nameNormalized));
  return match ? match.value : '';
}

function parseProductNameFields(name) {
  const raw = cleanText(name);
  const normalized = normalizeForMatch(raw);

  const capacitanceMatches = [
    ...raw.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(pF|nF|uF|µF|mF)\b/gi),
  ].map((m) => `${m[1].replace(',', '.')} ${m[2].replace('µ', 'u')}`);

  const voltageMatches = [
    ...raw.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kV|KV|VDC|VAC|V)\b/gi),
  ].map((m) => `${m[1].replace(',', '.')} ${String(m[2]).toUpperCase()}`);

  const sizeDimensionMatches = [
    ...raw.matchAll(/\b\d+(?:[.,]\d+)?(?:x|×)\d+(?:[.,]\d+)?(?:x\d+(?:[.,]\d+)?)?\s*mm\b/gi),
  ].map((m) => m[0].replace(/×/g, 'x').replace(/\s+/g, ''));

  const sizeSingleMmMatches = [...raw.matchAll(/\b\d+(?:[.,]\d+)?\s*mm\b/gi)].map((m) =>
    m[0].replace(/\s+/g, '')
  );

  const chipCodeMatches = [
    ...raw.matchAll(/\b(?:0201|0402|0603|0805|1206|1210|1812|2010|2512)\b/g),
  ].map((m) => m[0]);

  const tolerancePercentMatches = [...raw.matchAll(/\b\d{1,2}\s*%\b/g)].map((m) =>
    m[0].replace(/\s+/g, '')
  );

  const toleranceCodeMatches = [...raw.matchAll(/\b\d{2,4}\s*([JKM])\b/gi)].map((m) => m[1].toUpperCase());

  const quantityMatches = [
    ...raw.matchAll(/\((\d+\s*(?:c|chiếc|chiec|pcs|pc))\)/gi),
    ...raw.matchAll(/\b(\d+\s*(?:c|chiếc|chiec|pcs|pc))\b/gi),
  ].map((m) => m[1].replace(/\s+/g, ' ').trim());

  const mounting = [];
  if (normalized.includes('chan cam')) mounting.push('Chân cắm');
  if (normalized.includes('chan han')) mounting.push('Chân hàn');
  if (normalized.includes('dip')) mounting.push('DIP');
  if (normalized.includes('smd') || normalized.includes('tu dan')) mounting.push('SMD/Dán');
  if (normalized.includes('pcb')) mounting.push('PCB');
  if (normalized.includes(' day ') || normalized.endsWith(' day') || normalized.includes(' dong day')) {
    mounting.push('Dạng dây');
  }

  const applications = [];
  if (normalized.includes('bep tu')) applications.push('Bếp từ');
  if (normalized.includes('quat')) applications.push('Quạt');
  if (normalized.includes('dieu hoa')) applications.push('Điều hòa');
  if (normalized.includes('block')) applications.push('Block');
  if (normalized.includes('khoi dong')) applications.push('Khởi động');
  if (normalized.includes('chong set')) applications.push('Chống sét');
  if (normalized.includes('loc nguon')) applications.push('Lọc nguồn');
  if (normalized.includes('bao ve dien ap')) applications.push('Bảo vệ điện áp');

  const colorMatches = [...raw.matchAll(/\bmàu\s+([\p{L}0-9\-]+)/giu)].map((m) => `Màu ${m[1]}`);

  const brandMentionMatches = [
    ...raw.matchAll(/chính\s*hãng\s+([A-Za-z0-9-]+(?:\s+[A-Za-z0-9-]+){0,2})/gi),
    ...raw.matchAll(/\bdây\s+([A-Z][A-Z0-9-]{1,})\b/g),
  ].map((m) => m[1]);

  const capCodeFromHybridMatches = [
    ...raw.matchAll(/\b(\d{2,4})-\d+(?:[.,]\d+)?\s*(?:pF|nF|uF|µF|mF)\b/gi),
  ].map((m) => m[1]);

  const capacitanceSet = new Set(capacitanceMatches.map((v) => normalizeCompactToken(v)));
  const voltageSet = new Set(voltageMatches.map((v) => normalizeCompactToken(v)));
  const quantitySet = new Set(quantityMatches.map((v) => normalizeCompactToken(v)));

  const dimensionPairs = [];
  const dimensionSingle = [];
  for (const dim of [...sizeDimensionMatches, ...sizeSingleMmMatches]) {
    if (/x/i.test(dim)) {
      dimensionPairs.push(dim);
    } else {
      dimensionSingle.push(dim);
    }
  }

  const toleranceLetterSet = new Set(toleranceCodeMatches.map((v) => normalizeCompactToken(v)));

  const codeTokens = [...raw.matchAll(/\b[A-Za-z]*\d+[A-Za-z0-9-]*\b/g)]
    .map((m) => m[0])
    .filter((token) => !/^(?:\d+(?:[.,]\d+)?)$/i.test(token))
    .filter((token) => !/^(?:V|VAC|VDC|KV|UF|NF|PF|MF|MM)$/i.test(token))
    .filter((token) => !chipCodeMatches.includes(token))
    .filter((token) => {
      const compact = normalizeCompactToken(token);

      if (capacitanceSet.has(compact)) return false;
      if (voltageSet.has(compact)) return false;
      if (quantitySet.has(compact)) return false;
      if (toleranceLetterSet.has(compact)) return false;

      if (/^\d+(?:[.,]\d+)?$/.test(token)) return false;

      if (/^(?:\d+(?:[.,]\d+)?)x(?:\d+(?:[.,]\d+)?)(?:x\d+(?:[.,]\d+)?)?$/i.test(token)) return false;

      if (/^[A-Za-z]+\d+[A-Za-z0-9-]*$/.test(token)) return true;
      if (/^\d{2,4}[JKM]$/i.test(token)) return true;

      return false;
    });

  return {
    loai_tu_tu_ten: detectLoaiTu(normalized),
    ma_ky_hieu_tu_ten: uniqueByNormalized([...codeTokens, ...capCodeFromHybridMatches]).join(' | '),
    dien_dung_tu_ten: uniqueByNormalized(capacitanceMatches).join(' | '),
    dien_ap_tu_ten: uniqueByNormalized(voltageMatches).join(' | '),
    kich_thuoc_tu_ten: uniqueByNormalized([...dimensionPairs, ...dimensionSingle]).join(' | '),
    ma_kich_thuoc_chip_tu_ten: uniqueByNormalized(chipCodeMatches).join(' | '),
    dung_sai_tu_ten: uniqueByNormalized([...tolerancePercentMatches, ...toleranceCodeMatches]).join(' | '),
    kieu_lap_dat_tu_ten: uniqueByNormalized(mounting).join(' | '),
    dong_goi_so_luong_tu_ten: uniqueByNormalized(quantityMatches).join(' | '),
    ung_dung_tu_ten: uniqueByNormalized(applications).join(' | '),
    hang_nhac_toi_tu_ten: uniqueByNormalized(brandMentionMatches).join(' | '),
    mau_sac_tu_ten: uniqueByNormalized(colorMatches).join(' | '),
  };
}

async function fetchText(url, options = {}, retries = 2) {
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
          ...(options.headers || {}),
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} khi tải ${url}`);
      }

      return await response.text();
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;

      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
      }
    }
  }

  throw lastError;
}

async function fetchListPageByPostback(currentHtml, targetPage) {
  const hiddenFields = extractHiddenFields(currentHtml);

  hiddenFields.__EVENTTARGET = 'Control1$ctl00$ctl00$CollectionPager1';
  hiddenFields.__EVENTARGUMENT = String(targetPage);
  hiddenFields.__LASTFOCUS = hiddenFields.__LASTFOCUS || '';

  const body = new URLSearchParams(hiddenFields).toString();

  return fetchText(CATEGORY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: CATEGORY_URL,
      Origin: BASE_URL,
    },
    body,
  });
}

async function runWithConcurrency(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;

  async function runner() {
    while (true) {
      const index = cursor;
      cursor += 1;

      if (index >= items.length) break;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => runner()));
  return results;
}

async function main() {
  console.log('[1/6] Tải trang danh mục tụ điện (trang 1)...');
  let currentHtml = await fetchText(CATEGORY_URL);

  const detectedTotalPages = extractTotalPages(currentHtml);
  const totalPages = Math.min(detectedTotalPages || 1, TARGET_MAX_PAGES);

  console.log(`    Tổng trang phát hiện: ${detectedTotalPages}. Sẽ crawl: ${totalPages} trang.`);

  const allListProducts = [];

  for (let page = 1; page <= totalPages; page += 1) {
    if (page > 1) {
      console.log(`    Tải trang ${page}/${totalPages} qua postback...`);
      currentHtml = await fetchListPageByPostback(currentHtml, page);
      await sleep(250);
    }

    const pageProducts = extractProductsFromListPage(currentHtml, page);
    console.log(`      -> Trang ${page}: ${pageProducts.length} sản phẩm`);
    allListProducts.push(...pageProducts);
  }

  console.log(`[2/6] Tổng sản phẩm list (raw): ${allListProducts.length}`);

  const uniqueByUrl = new Map();
  for (const item of allListProducts) {
    if (!item.url_chi_tiet) continue;
    if (!uniqueByUrl.has(item.url_chi_tiet)) {
      uniqueByUrl.set(item.url_chi_tiet, item);
    }
  }

  const uniqueProducts = [...uniqueByUrl.values()];
  console.log(`[3/6] Sản phẩm unique theo link: ${uniqueProducts.length}`);

  console.log('[4/6] Crawl trang chi tiết sản phẩm...');
  let completed = 0;

  const enriched = await runWithConcurrency(
    uniqueProducts,
    async (item) => {
      try {
        const detailHtml = await fetchText(item.url_chi_tiet);
        const detail = extractDetailData(detailHtml);

        completed += 1;
        if (completed % 20 === 0 || completed === uniqueProducts.length) {
          console.log(`      -> Đã xử lý ${completed}/${uniqueProducts.length} trang detail`);
        }

        return {
          ...item,
          ...detail,
          ten_san_pham: detail.ten_san_pham_detail || item.ten_san_pham_list,
        };
      } catch (error) {
        completed += 1;
        console.warn(`      ! Lỗi detail: ${item.url_chi_tiet} :: ${error.message}`);

        return {
          ...item,
          ten_san_pham: item.ten_san_pham_list,
          ten_san_pham_detail: '',
          ma_san_pham: '',
          gia_chua_vat_text: '',
          gia_chua_vat_vnd: '',
          gia_vat_text: '',
          gia_vat_vnd: '',
          tinh_trang: '',
          don_vi_tinh: '',
          thuong_hieu: '',
          xuat_xu: '',
          vi_tri_kho: '',
          danh_muc_1: '',
          danh_muc_2: '',
          image_detail_url: '',
        };
      }
    },
    DETAIL_CONCURRENCY
  );

  console.log('[5/6] Tách riêng các trường nằm trong tên sản phẩm...');
  const finalRows = enriched.map((row, index) => {
    const nameFields = parseProductNameFields(row.ten_san_pham || '');

    return {
      stt: index + 1,
      trang_danh_muc: row.page,
      ten_san_pham: row.ten_san_pham || '',
      ma_san_pham: row.ma_san_pham || '',
      loai_tu_tu_ten: nameFields.loai_tu_tu_ten,
      ma_ky_hieu_tu_ten: nameFields.ma_ky_hieu_tu_ten,
      dien_dung_tu_ten: nameFields.dien_dung_tu_ten,
      dien_ap_tu_ten: nameFields.dien_ap_tu_ten,
      kich_thuoc_tu_ten: nameFields.kich_thuoc_tu_ten,
      ma_kich_thuoc_chip_tu_ten: nameFields.ma_kich_thuoc_chip_tu_ten,
      dung_sai_tu_ten: nameFields.dung_sai_tu_ten,
      kieu_lap_dat_tu_ten: nameFields.kieu_lap_dat_tu_ten,
      dong_goi_so_luong_tu_ten: nameFields.dong_goi_so_luong_tu_ten,
      ung_dung_tu_ten: nameFields.ung_dung_tu_ten,
      hang_nhac_toi_tu_ten: nameFields.hang_nhac_toi_tu_ten,
      mau_sac_tu_ten: nameFields.mau_sac_tu_ten,
      gia_chua_vat_text: row.gia_chua_vat_text || row.gia_list_text || '',
      gia_chua_vat_vnd: row.gia_chua_vat_vnd || row.gia_list_vnd || '',
      gia_vat_text: row.gia_vat_text || '',
      gia_vat_vnd: row.gia_vat_vnd || '',
      tinh_trang: row.tinh_trang || '',
      don_vi_tinh: row.don_vi_tinh || '',
      thuong_hieu: row.thuong_hieu || '',
      xuat_xu: row.xuat_xu || '',
      vi_tri_kho: row.vi_tri_kho || '',
      danh_muc_1: row.danh_muc_1 || '',
      danh_muc_2: row.danh_muc_2 || '',
      sp_group_id_tu_url: row.sp_group_id_tu_url || '',
      ct_product_id_tu_url: row.ct_product_id_tu_url || '',
      url_chi_tiet: row.url_chi_tiet || '',
      image_url: row.image_detail_url || row.image_list_url || '',
    };
  });

  const headers = [
    'stt',
    'trang_danh_muc',
    'ten_san_pham',
    'ma_san_pham',
    'loai_tu_tu_ten',
    'ma_ky_hieu_tu_ten',
    'dien_dung_tu_ten',
    'dien_ap_tu_ten',
    'kich_thuoc_tu_ten',
    'ma_kich_thuoc_chip_tu_ten',
    'dung_sai_tu_ten',
    'kieu_lap_dat_tu_ten',
    'dong_goi_so_luong_tu_ten',
    'ung_dung_tu_ten',
    'hang_nhac_toi_tu_ten',
    'mau_sac_tu_ten',
    'gia_chua_vat_text',
    'gia_chua_vat_vnd',
    'gia_vat_text',
    'gia_vat_vnd',
    'tinh_trang',
    'don_vi_tinh',
    'thuong_hieu',
    'xuat_xu',
    'vi_tri_kho',
    'danh_muc_1',
    'danh_muc_2',
    'sp_group_id_tu_url',
    'ct_product_id_tu_url',
    'url_chi_tiet',
    'image_url',
  ];

  const csv = [
    headers.join(','),
    ...finalRows.map((row) => headers.map((h) => csvEscape(row[h])).join(',')),
  ].join('\n');

  await fs.writeFile(OUTPUT_CSV_PATH, csv, 'utf8');

  console.log('[6/6] Hoàn tất.');
  console.log(`    CSV: ${OUTPUT_CSV_PATH}`);
  console.log(`    Tổng dòng: ${finalRows.length}`);
}

main().catch((error) => {
  console.error('Crawl thất bại:', error);
  process.exitCode = 1;
});
