<?php
// public/index.php
declare(strict_types=1);

// Force JSON responses and suppress HTML error pages from the built-in PHP server.
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=utf-8');

// Convert fatal/shutdown errors to JSON so the proxy won't receive HTML.
register_shutdown_function(function () {
    $err = error_get_last();
    if ($err !== null && in_array($err['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        http_response_code(500);
        error_log('Shutdown error: ' . print_r($err, true));
        echo json_encode([
            'error' => $err['message'] ?? 'Fatal error',
            'file' => $err['file'] ?? null,
            'line' => $err['line'] ?? null,
        ]);
        // Ensure output is sent
        flush();
    }
});

$token = getenv('READY2ORDER_ACCOUNT_TOKEN');
// Fallback to the (misspelled) var used in the repo `.env.local` if present.
if (!$token) {
    $token = getenv('READY2ODER_ACCOUNT_TOKEN');
}
if (!$token) {
    http_response_code(500);
    echo json_encode(['error' => 'Missing READY2ORDER_ACCOUNT_TOKEN']);
    exit;
}

// If Composer autoload exists (package installed), include it. Otherwise continue
// and use the simple curl-based fallback below.
$autoload = __DIR__ . '/../vendor/autoload.php';
if (file_exists($autoload)) {
    require $autoload;
} else {
    // optional: log a warning to the PHP dev server output
    error_log('Composer autoload not found; continuing with curl fallback. Run "composer install" in ready2order-service to enable the official client.');
}

try {
    // Example — adapt to the real package API:
    // $client = new \Ready2Order\Client(['token' => $token]);
    // $products = $client->products()->list(); // pseudo-code

    // If the package exposes a Guzzle client or wrapper, use it.
    // Below is a generic HTTP example using the token to call the REST API
    // if you prefer to not rely on the package API specifics.
    // IMPORTANT: Ready2Order expects includeProductGroup (and similar flags)
    // as query parameters, not HTTP headers — so forward the incoming
    // query string to the upstream URL.
    $upstream = 'https://api.ready2order.com/v1/products';
    if (!empty($_SERVER['QUERY_STRING'])) {
        $upstream .= '?' . $_SERVER['QUERY_STRING'];
    }
    // Simpler paginated fetch: call the upstream with page & limit query
    // parameters and aggregate results until a page returns fewer items than
    // the requested limit. This matches the pattern used by the Ready2Order
    // API (e.g. ?page=2&limit=255).
    $qs = $_SERVER['QUERY_STRING'] ?? '';
    parse_str($qs, $params);
    // remove any incoming page/limit — we'll control them
    unset($params['page'], $params['limit']);
    $baseQuery = http_build_query($params);
    $baseUrl = 'https://api.ready2order.com/v1/products' . ($baseQuery !== '' ? '?' . $baseQuery . '&' : '?');

    // Use the upstream maximum page size (250). Some Ready2Order endpoints
    // silently cap the page size to 250 — requesting 255 can cause the first
    // page to return 250 which (incorrectly) appears < $limit and stops the
    // loop early. Set requested limit to 250 and cap any incoming 'limit'
    // query param to this value.
    $upstreamMaxLimit = 250;
    $limit = $upstreamMaxLimit;
    if (isset($params['limit'])) {
        $requested = (int)$params['limit'];
        if ($requested > 0) {
            $limit = min($requested, $upstreamMaxLimit);
        }
    }
    $page = 1;
    $aggregated = [];
    $maxPages = 100; // safety guard

    // Pre-fetch product groups (paged) so we can inspect ancestor group names
    // and exclude products whose category path contains '!'. If this fails
    // we'll gracefully fall back to the simple immediate-group-name check.
    $groupLimit = $upstreamMaxLimit;
    $groupPage = 1;
    $groupMaxPages = 50;
    $groupMap = []; // productgroup_id => ['name'=>..., 'parent'=>...]
    $groupBaseUrl = 'https://api.ready2order.com/v1/productgroups' . ($baseQuery !== '' ? '?' . $baseQuery . '&' : '?');
    while ($groupPage <= $groupMaxPages) {
        $gurl = $groupBaseUrl . 'page=' . $groupPage . '&limit=' . $groupLimit;
        $gch = curl_init($gurl);
        curl_setopt($gch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($gch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ]);
        curl_setopt($gch, CURLOPT_FOLLOWLOCATION, true);
        $gbody = curl_exec($gch);
        $gerr = curl_error($gch);
        $gstatus = curl_getinfo($gch, CURLINFO_HTTP_CODE);
        curl_close($gch);

        if ($gerr) {
            // stop trying to fetch groups; proceed without full group map
            break;
        }

        $gjson = json_decode($gbody, true);
        if ($gjson === null) break;

        $gitems = [];
        if (is_array($gjson) && array_values($gjson) === $gjson) {
            $gitems = $gjson;
        } elseif (isset($gjson['productgroups']) && is_array($gjson['productgroups'])) {
            $gitems = $gjson['productgroups'];
        } elseif (isset($gjson['items']) && is_array($gjson['items'])) {
            $gitems = $gjson['items'];
        } elseif (isset($gjson['data']) && is_array($gjson['data'])) {
            $gitems = $gjson['data'];
        } elseif (isset($gjson['results']) && is_array($gjson['results'])) {
            $gitems = $gjson['results'];
        } elseif (isset($gjson['payload']) && is_array($gjson['payload'])) {
            $gitems = $gjson['payload'];
        }

        foreach ($gitems as $g) {
            if (!is_array($g)) continue;
            $gid = $g['productgroup_id'] ?? ($g['id'] ?? null);
            if ($gid === null) continue;
            $groupMap[$gid] = [
                'name' => trim((string)($g['productgroup_name'] ?? $g['name'] ?? '')),
                'parent' => $g['productgroup_parent'] ?? ($g['parent'] ?? null),
            ];
        }

        if (count($gitems) < $groupLimit) break;
        $groupPage++;
    }

    while ($page <= $maxPages) {
        $url = $baseUrl . 'page=' . $page . '&limit=' . $limit;

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $token,
            'Accept: application/json',
        ]);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        $body = curl_exec($ch);
        $err = curl_error($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($err) {
            http_response_code(502);
            echo json_encode(['error' => 'Upstream request failed', 'detail' => $err]);
            exit;
        }

        $json = json_decode($body, true);
        if ($json === null) {
            // Not JSON — on first page return raw body, otherwise stop.
            if ($page === 1) {
                http_response_code($status ?: 200);
                echo $body;
                exit;
            }
            break;
        }

        // Extract items from common shapes
        $items = [];
        if (is_array($json) && array_values($json) === $json) {
            $items = $json;
        } elseif (isset($json['products']) && is_array($json['products'])) {
            $items = $json['products'];
        } elseif (isset($json['items']) && is_array($json['items'])) {
            $items = $json['items'];
        } elseif (isset($json['data']) && is_array($json['data'])) {
            $items = $json['data'];
        } elseif (isset($json['results']) && is_array($json['results'])) {
            $items = $json['results'];
        } elseif (isset($json['payload']) && is_array($json['payload'])) {
            $items = $json['payload'];
        }

        if (!empty($items)) {
            $aggregated = array_merge($aggregated, $items);
        }

        // If fewer items than limit, we've reached the last page
        if (count($items) < $limit) {
            break;
        }

        $page++;
    }

    if (!empty($aggregated)) {
        $beforeCount = count($aggregated);

        // Allow bypassing server-side filters for debugging or special clients.
        // Usage: ?raw=1 or ?filter=false will return the aggregated, unfiltered list.
        $rawMode = false;
        if (isset($_GET['raw']) && in_array($_GET['raw'], ['1', 'true', 'yes'], true)) {
            $rawMode = true;
        }
        if (isset($_GET['filter']) && $_GET['filter'] === 'false') {
            $rawMode = true;
        }

        if ($rawMode) {
            header('Content-Type: application/json; charset=utf-8');
            header('X-Pages-Fetched: ' . $page);
            header('X-Items-Aggregated: ' . $beforeCount);
            header('X-Filter-Applied: 0');
            echo json_encode($aggregated, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }

        // Apply server-side filtering to match the client-side rules and reduce payload.
        $filtered = array_values(array_filter($aggregated, function ($p) use ($groupMap) {
            if (!is_array($p)) return false;
            $name = trim((string)($p['product_name'] ?? ''));
            if ($name === '') return false;
            // Exclude promotional / weekly items that contain "Woche"
            // (case-insensitive). Example: "Burger der Woche".
            if (stripos($name, 'Woche') !== false) return false;
            if (isset($p['product_active']) && !$p['product_active']) return false;
            if (strpos($name, '!') !== false) return false;
            if (isset($p['productgroup']) && is_array($p['productgroup'])) {
                $g = $p['productgroup'];
                $gname = trim((string)($g['productgroup_name'] ?? ''));
                if ($gname !== '' && strpos($gname, '!') !== false) return false;

                // If we have a group map, walk ancestor chain and reject if any
                // ancestor group name contains '!'. This removes products that
                // sit under parent categories named with '!' anywhere in the
                // path (e.g. "!Specials / Bier").
                $gid = $g['productgroup_id'] ?? ($g['id'] ?? null);
                if (!empty($groupMap) && $gid) {
                    $anc = $gid;
                    while ($anc) {
                        if (!isset($groupMap[$anc])) break;
                        $aname = $groupMap[$anc]['name'] ?? '';
                        if ($aname !== '' && strpos($aname, '!') !== false) return false;
                        $anc = $groupMap[$anc]['parent'] ?? null;
                        // normalize empty/0 parent to null to stop the loop
                        if ($anc === 0 || $anc === '0' || $anc === '') $anc = null;
                    }
                }
            }
            return true;
        }));

        $afterCount = count($filtered);

        header('Content-Type: application/json; charset=utf-8');
        header('X-Pages-Fetched: ' . $page);
        header('X-Items-Aggregated: ' . $beforeCount);
        header('X-Items-After-Filter: ' . $afterCount);
        header('X-Filter-Applied: 1');
        echo json_encode($filtered, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    // Fallback: return the last page body
    http_response_code($status ?: 200);
    echo $body;
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}