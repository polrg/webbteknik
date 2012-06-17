<?php
/**
 * Load files for later usage and instantiate common objects/classes
 * 
 * @author     Lars Gunther <gunther@keryx.se>
 * @copyright  Lars Gunther <gunther@keryx.se>
 * @license    Creative Commons Attribution-Noncommercial-Share Alike 3.0 http://creativecommons.org/licenses/by-nc-sa/3.0/
 * @package    webbteknik.nu
 * @filesource
 */

// Include path
$BELOWROOT = dirname(dirname(__FILE__));
set_include_path(
    get_include_path() . PATH_SEPARATOR . $BELOWROOT . DIRECTORY_SEPARATOR . 'includes' .
    PATH_SEPARATOR . $BELOWROOT . DIRECTORY_SEPARATOR . 'keryxIncludes.ep'
);

/**
 * Fire PHP, loads from PEAR
 */
require_once('FirePHPCore/FirePHP.class.php');

/**
 * Configuration
 */
require_once 'config.php';

/**
 * Database
 */
require_once 'keryxDB2/cx.php';

/**
 * Users
 */
require_once 'user.php';