var dbExists = true;

function checkDatabase() {
    var request = window.indexeddb.open("db");
    request.onupgradeneeded = function (e) {
        e.target.transaction.abort();
        dbExists = false;
    }
    console.log(`dbExists: ${dbExists}`);
    return dbExists;
}