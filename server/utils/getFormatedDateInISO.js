function getFormatedDateInISO () {
    let date = new Date();
    let iso = date.getFullYear().toString() + "-";
    iso += (date.getMonth() + 1).toString().padStart(2, '0') + "-";
    iso += date.getDate().toString().padStart(2, '0') + "T";
    iso += date.getHours().toString().padStart(2, '0') + ":";
    iso += date.getMinutes().toString().padStart(2, '0') + ":";
    iso += date.getSeconds().toString().padStart(2, '0');
    
    return iso;
}

module.exports = { getFormatedDateInISO }