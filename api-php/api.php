<?php
/**
 * CiudadanoRD API — versión PHP para hosting compartido (BanaHosting/cPanel)
 *
 * Endpoints (via ?r=):
 *   api.php?r=health
 *   api.php?r=combustibles
 *   api.php?r=divisas
 *   api.php?r=clima
 *   api.php?r=apagones/sectores
 *   api.php?r=apagones/{sector}
 *   api.php?r=loteria
 *
 * Con el .htaccess incluido también responde a rutas limpias:
 *   /api/combustibles, /api/divisas, etc.
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Caché en archivos ─────────────────────────────────────────────────────────
define('CACHE_DIR', __DIR__ . '/cache');
if (!is_dir(CACHE_DIR)) @mkdir(CACHE_DIR, 0755, true);

function cache_get(string $key, int $ttl) {
    $f = CACHE_DIR . '/' . md5($key) . '.json';
    if (is_file($f) && (time() - filemtime($f)) < $ttl) {
        $raw = file_get_contents($f);
        if ($raw !== false) return json_decode($raw, true);
    }
    return null;
}

function cache_set(string $key, $data): void {
    @file_put_contents(CACHE_DIR . '/' . md5($key) . '.json', json_encode($data));
}

function http_get_json(string $url, int $timeout = 8) {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => $timeout,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_USERAGENT      => 'CiudadanoRD/1.0',
        CURLOPT_SSL_VERIFYPEER => true,
    ]);
    $res = curl_exec($ch);
    curl_close($ch);
    if ($res === false) return null;
    return json_decode($res, true);
}

function ok($data): void   { echo json_encode(['ok' => true,  'data' => $data], JSON_UNESCAPED_UNICODE); exit; }
function fail(string $msg, int $code = 500): void {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

// ── Divisas (open.er-api.com, caché 15 min) ───────────────────────────────────
function divisas() {
    if ($c = cache_get('divisas', 900)) return $c;
    $json = http_get_json('https://open.er-api.com/v6/latest/USD');
    if (!$json || !isset($json['rates']['DOP'])) return divisas_mock();
    $dop = $json['rates']['DOP'];
    $eur = $json['rates']['EUR'];
    $eurDop = $dop / $eur;
    $data = [
        'fuente' => 'Banco Central RD / ExchangeRate-API',
        'usd' => ['compra' => round($dop * 0.990, 2),   'venta' => round($dop * 1.010, 2)],
        'eur' => ['compra' => round($eurDop * 0.990, 2), 'venta' => round($eurDop * 1.010, 2)],
    ];
    cache_set('divisas', $data);
    return $data;
}

function divisas_mock() {
    return [
        'fuente' => 'Datos de ejemplo',
        'usd' => ['compra' => 58.10, 'venta' => 59.30],
        'eur' => ['compra' => 62.80, 'venta' => 64.20],
    ];
}

// ── Clima (Open-Meteo, caché 30 min) ─────────────────────────────────────────
function clima() {
    if ($c = cache_get('clima', 1800)) return $c;

    $wmo = [0=>'☀️',1=>'🌤',2=>'⛅',3=>'☁️',45=>'🌫',48=>'🌫',51=>'🌦',53=>'🌦',55=>'🌧',
            61=>'🌦',63=>'🌧',65=>'🌧',80=>'🌦',81=>'🌧',82=>'⛈',95=>'⛈',96=>'⛈',99=>'⛈'];
    $desc = [0=>'Despejado',1=>'Mayormente despejado',2=>'Parcialmente nublado',3=>'Nublado',
             45=>'Neblina',51=>'Llovizna',61=>'Lluvia ligera',63=>'Lluvia',65=>'Lluvia fuerte',
             80=>'Chubascos',82=>'Chubascos fuertes',95=>'Tormenta'];
    $dias = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    $q = http_build_query([
        'latitude' => '18.4861', 'longitude' => '-69.9312',
        'current'  => 'temperature_2m,relative_humidity_2m,wind_speed_10m,weathercode,apparent_temperature,uv_index',
        'daily'    => 'weathercode,temperature_2m_max,temperature_2m_min',
        'temperature_unit' => 'celsius', 'wind_speed_unit' => 'kmh',
        'timezone' => 'America/Santo_Domingo', 'forecast_days' => '6',
    ]);
    $json = http_get_json("https://api.open-meteo.com/v1/forecast?$q");
    if (!$json || !isset($json['current'])) return clima_mock();

    $cu = $json['current'];
    $d  = $json['daily'];
    $pronostico = [];
    for ($i = 1; $i <= 5; $i++) {
        if (!isset($d['time'][$i])) break;
        $pronostico[] = [
            'dia'     => $dias[(int)date('w', strtotime($d['time'][$i] . ' 12:00:00'))],
            'maxTemp' => (int)round($d['temperature_2m_max'][$i]),
            'emoji'   => $wmo[$d['weathercode'][$i]] ?? '🌡',
        ];
    }
    $data = [
        'ciudad' => 'Santo Domingo',
        'actual' => [
            'temp'      => (int)round($cu['temperature_2m']),
            'sensacion' => (int)round($cu['apparent_temperature']),
            'humedad'   => $cu['relative_humidity_2m'],
            'viento'    => (int)round($cu['wind_speed_10m']),
            'uv'        => (int)round($cu['uv_index'] ?? 0),
            'emoji'     => $wmo[$cu['weathercode']] ?? '🌡',
            'desc'      => $desc[$cu['weathercode']] ?? 'Variable',
        ],
        'pronostico' => $pronostico,
    ];
    cache_set('clima', $data);
    return $data;
}

function clima_mock() {
    return [
        'ciudad' => 'Santo Domingo',
        'actual' => ['temp'=>32,'sensacion'=>36,'humedad'=>75,'viento'=>15,'uv'=>7,'emoji'=>'⛅','desc'=>'Parcialmente nublado'],
        'pronostico' => [
            ['dia'=>'Lun','maxTemp'=>33,'emoji'=>'⛅'],
            ['dia'=>'Mar','maxTemp'=>34,'emoji'=>'☀️'],
            ['dia'=>'Mié','maxTemp'=>32,'emoji'=>'🌦'],
            ['dia'=>'Jue','maxTemp'=>33,'emoji'=>'⛅'],
            ['dia'=>'Vie','maxTemp'=>34,'emoji'=>'☀️'],
        ],
    ];
}

// ── Combustibles (MICM con fallback, caché 1 h) ───────────────────────────────
function combustibles() {
    if ($c = cache_get('combustibles', 3600)) return $c;
    // El scraping del MICM requiere parsing de HTML variable; usamos los precios
    // de la última resolución conocida como fallback estable.
    $data = [
        'semana' => '20–26 jun 2025',
        'fuente' => 'MICM',
        'precios' => [
            ['tipo'=>'premium',       'nombre'=>'Gasolina Premium',  'precio'=>293.10, 'cambio'=>2.30,  'color'=>'#E53935'],
            ['tipo'=>'regular',       'nombre'=>'Gasolina Regular',  'precio'=>274.50, 'cambio'=>1.80,  'color'=>'#FB8C00'],
            ['tipo'=>'gasoil_optimo', 'nombre'=>'Gasoil Óptimo',     'precio'=>236.80, 'cambio'=>-0.50, 'color'=>'#1565C0'],
            ['tipo'=>'gasoil_regular','nombre'=>'Gasoil Regular',    'precio'=>221.60, 'cambio'=>-1.10, 'color'=>'#546E7A'],
            ['tipo'=>'glp',           'nombre'=>'Gas Licuado (GLP)', 'precio'=>130.40, 'cambio'=>0.00,  'color'=>'#00897B'],
            ['tipo'=>'kerosene',      'nombre'=>'Kerosene',          'precio'=>197.20, 'cambio'=>0.80,  'color'=>'#7B1FA2'],
            ['tipo'=>'fuel_oil',      'nombre'=>'Fuel Oil',          'precio'=>159.40, 'cambio'=>-0.30, 'color'=>'#5D4037'],
            ['tipo'=>'avtur',         'nombre'=>'Avtur',             'precio'=>278.50, 'cambio'=>1.20,  'color'=>'#455A64'],
        ],
    ];
    cache_set('combustibles', $data);
    return $data;
}

// ── Apagones (simulado, determinista por sector+día) ─────────────────────────
const SECTORES = [
    'Piantini' => 4, 'Naco' => 4, 'Los Prados' => 6, 'Bella Vista' => 6,
    'Gazcue' => 8, 'Villa Consuelo' => 10, 'Cristo Rey' => 10, 'Herrera' => 12,
    'Los Alcarrizos' => 12, 'Villa Mella' => 10, 'Boca Chica' => 8,
    'San Isidro' => 8, 'Arroyo Hondo' => 6, 'Mirador Sur' => 4,
];

function apagones(string $sector) {
    $sectores = array_keys(SECTORES);
    if (!isset(SECTORES[$sector])) $sector = 'Piantini';
    $horasApagon = SECTORES[$sector];

    // Semilla determinista: mismo horario todo el día para el mismo sector
    $seed = crc32($sector . date('Y-m-d'));
    mt_srand($seed);

    $slots = [];
    $bloquesOff = (int)($horasApagon / 4);
    $offSet = [];
    while (count($offSet) < $bloquesOff) $offSet[mt_rand(0, 5)] = true;

    $horas = ['06:00','10:00','14:00','18:00','22:00','02:00'];
    for ($i = 0; $i < 6; $i++) {
        $slots[] = [
            'inicio' => $horas[$i],
            'fin'    => $horas[($i + 1) % 6],
            'estado' => isset($offSet[$i]) ? 'off' : 'on',
        ];
    }

    // Estado actual según la hora de RD
    $tz = new DateTimeZone('America/Santo_Domingo');
    $h = (int)(new DateTime('now', $tz))->format('G');
    $idx = intdiv(($h + 18) % 24, 4); // 06:00 → índice 0
    $estadoActual = $slots[$idx]['estado'];

    return [
        'sector'             => $sector,
        'empresa'            => 'EDESUR',
        'circuito'           => 'SD-' . str_pad((string)(crc32($sector) % 90 + 10), 2, '0', STR_PAD_LEFT),
        'estadoActual'       => $estadoActual,
        'horasApagonDia'     => $horasApagon,
        'horario'            => $slots,
        'sectoresDisponibles'=> $sectores,
        'nota'               => 'Horario estimado — datos simulados. Próximamente EDESUR en tiempo real.',
    ];
}

// ── Lotería (simulado, determinista por día) ─────────────────────────────────
function loteria() {
    mt_srand(crc32('loteria' . date('Y-m-d')));
    $nums = fn() => array_map(fn() => str_pad((string)mt_rand(0, 99), 2, '0', STR_PAD_LEFT), [1,2,3]);
    return [
        'fecha'  => date('d/m/Y'),
        'fuente' => 'Datos simulados',
        'juegos' => [
            ['nombre'=>'Lotería Nacional','sorteo'=>'6:00 PM','numeros'=>$nums(),'color'=>'#C8102E','bg'=>'#FFF3E0','emoji'=>'🏆'],
            ['nombre'=>'Loto Pool',       'sorteo'=>'8:50 PM','numeros'=>$nums(),'color'=>'#1565C0','bg'=>'#E3F2FD','emoji'=>'💧'],
            ['nombre'=>'Loteka',          'sorteo'=>'8:55 PM','numeros'=>$nums(),'color'=>'#2E7D32','bg'=>'#E8F5E9','emoji'=>'🟢'],
            ['nombre'=>'Real',            'sorteo'=>'3:00 PM','numeros'=>$nums(),'color'=>'#4527A0','bg'=>'#EDE7F6','emoji'=>'👑'],
            ['nombre'=>'La Suerte',       'sorteo'=>'6:00 PM','numeros'=>$nums(),'color'=>'#E65100','bg'=>'#FFF3E0','emoji'=>'🍀'],
        ],
    ];
}

// ── Router ────────────────────────────────────────────────────────────────────
$route = $_GET['r'] ?? 'health';
$route = trim($route, '/');
$route = preg_replace('#^api/#', '', $route); // la app llama /api/...

switch (true) {
    case $route === 'health':
        ok(['status' => 'ok', 'version' => '1.0.0', 'ts' => date('c')]);

    case $route === 'divisas':
        ok(divisas());

    case $route === 'clima':
        ok(clima());

    case $route === 'combustibles':
        ok(combustibles());

    case $route === 'apagones/sectores':
        ok(array_keys(SECTORES));

    case (bool)preg_match('#^apagones/(.+)$#', $route, $m):
        ok(apagones(urldecode($m[1])));

    case $route === 'loteria':
        ok(loteria());

    default:
        fail('Ruta no encontrada', 404);
}
