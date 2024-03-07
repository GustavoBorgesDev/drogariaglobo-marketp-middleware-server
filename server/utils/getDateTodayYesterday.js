// Util: Pego a Data atual e Anterior já formada em ISO
function getDateTodayYesterday () {
    let tDate = new Date();
    let yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);

    tDate = (tDate.toISOString()).split("T")[0];
    yDate = (yDate.toISOString()).split("T")[0];

    return {
        tdDate: tDate,
        ydDate: yDate
    }
}

module.exports = { getDateTodayYesterday }