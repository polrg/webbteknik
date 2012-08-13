<?php
/**
 * Receives progress report through AJAX when viewing videos
 *
 * @author <gunther@keryx.se>
 * @version "Under construction 1"
 * @license http://www.mozilla.org/MPL/
 * @package webbteknik.nu
 * 
 */

session_start();
require_once '../../includes/loadfiles.php';

user::setSessionData();

user::requires(user::TEXTBOOK);

// Database settings and connection
$dbx = config::get('dbx');
// init
$dbh = keryxDB2_cx::get($dbx);

// Reset - if present, must be name of video
// TODO Change to use joblistID
if ( isset($_POST['reset']) ) {
    $sql = <<<SQL
        DELETE FROM `userprogress`
        WHERE joblistID = :joblistID and email = :email
SQL;
    $stmt = $dbh->prepare($sql);
    $stmt->bindParam(':joblistID', $_POST['reset']);
    $stmt->bindParam(':email', $_SESSION['user']);
    $stmt->execute();
    // TODO Check for no rows affected == bad name for video
    echo "User progress data for video deleted";
    exit;
}


$reportdata = filter_var($_POST['reportdata'], FILTER_UNSAFE_RAW, FILTER_FLAG_STRIP_LOW|FILTER_FLAG_STRIP_HIGH);

$reportdata = json_decode($reportdata);
// status - if present, must be enum("begun", "skipped", "finished")
// JavaScripts use the value "unset", but that means keep DB empty i.e. no record stored at all
$reportdata->status = in_array($reportdata->status, array("begun", "skipped", "finished")) ? $reportdata->status : null;

// $reportdata == null <=> TimeRanges not supported, set status only

/*
$reportdata->src must be /[a-z0-9-]+/
$reportdata->firstStop must be numeric
$reportdata->viewTotal must be numeric
$reportdata->stops must be array (at least 1 in size)
$reportdata->percentage_complete must be integer 0 <= x <= 100


client side normalization of stops-array is taken for granted
Total reset of stops array if resetstatus should be 'unset'
*/

// Partial clone to insert into db column progressdata
if ( isset($reportdata->firstStop) ) {
    $progressdata = new StdClass();
    $progressdata->firstStop = $reportdata->firstStop;
    $progressdata->viewTotal = $reportdata->viewTotal;
    $progressdata->stops     = $reportdata->stops;
    $progressdata = json_encode($progressdata);
} else {
    $progressdata = "";
}

// First view = create row

// TODO Change this to use joblist
$sql = "SELECT * FROM userprogress WHERE email = :email AND joblistID = :joblistID";

$stmt = $dbh->prepare($sql);
$stmt->bindParam(':email', $_SESSION['user']);
$stmt->bindParam(':joblistID', $reportdata->joblistID);
$stmt->execute();

$curdata = $stmt->fetch();

// TODO Allow manual unset/reset of status (also by teacher!)
if ( empty($reportdata->status) ) {
    // No need to store any data
    exit("No data to store in DB");
}

if ( !$curdata ) {
    $sql = "INSERT INTO userprogress (email, joblistID, progressdata, percentage_complete, status) " .
           "VALUES (:email, :joblistID, :progressdata, :percentage_complete, :status)";
} else {
    $sql = "UPDATE userprogress " .
           "SET progressdata = :progressdata, percentage_complete = :percentage_complete, status = :status " .
           "WHERE email = :email AND joblistID = :joblistID";
}
try {
    $stmt = $dbh->prepare($sql);
    $stmt->bindParam(':email', $_SESSION['user']);
    $stmt->bindParam(':joblistID', $reportdata->joblistID);
    $stmt->bindParam(':progressdata', $progressdata); // JSON-encoded
    $stmt->bindParam(':percentage_complete', $reportdata->percentage_complete);
    $stmt->bindParam(':status', $reportdata->status);
    $stmt->execute();
}
catch (PDOException $e) {
    header($_SERVER['SERVER_PROTOCOL'] . ' 500 Internal Server Error', true, 500);
    echo "Progressdata could not be loaded into database";
    var_dump($e);
    // TODO FirePHP for debug
    exit;
}
echo "Progressdata saved";
