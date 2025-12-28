<?php
// Simple router for PHP built-in server so requests like /products are handled by index.php
if (php_sapi_name() === 'cli-server') {
    $url  = parse_url($_SERVER['REQUEST_URI']);
    $file = __DIR__ . $url['path'];
    if (is_file($file)) {
        // Serve the requested resource as-is
        return false;
    }
}

require __DIR__ . '/index.php';
