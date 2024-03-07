const express = require("express");
const router = express.Router();
const axios = require("axios");
const interpapi = require("../api/interplayers");
const prodCredentials = require("../configs/production-credentials");
const headersVtex = require("../configs/vtex-headers");
const dm = require("../configs/domains");

let moment = require("moment");
let mmtz = require('moment-timezone');
moment.locale("pt-br");
mmtz.tz('America/Sao_Paulo');

// Utils
const utilMd = require("../utils/sendDataMd");
const utilToken = require("../utils/getInterplayersToken");
const utilDate = require("../utils/getFormatedDateInISO");

router.post("/middleware/v2/run-middleware-loadtables", async (req, res) => {

    console.log("\n\n\n----- [controller.loadtables.js] ----- \n");
    console.log("----- INICIANDO MIDDLWARE INTERPLAYERS ----- \n\n\n");

    console.log("[1] - Gerando o Token...\n");
    const respToken = await utilToken.getInterplayersToken();
    if (respToken.status != 200) {
        res.json({
            message: 'Erro no token'
        })
        return; 
    }

    const TOKEN = respToken.data.access_token;
    console.log("[1] - (Sucesso) - Token Gerado.\n");
    console.log("[2] - Buscando o load tables...\n");
    let respGetLoadTables = await getLoadTables(TOKEN);
    if (respGetLoadTables == undefined || respGetLoadTables.status != 200) {
        console.log("[2] - Erro no loadtables encerrando middleware.\n");
        return; 
    }   

    let status = respGetLoadTables.status;
    respGetLoadTables = respGetLoadTables.data;
    respGetLoadTables["status"] = status;
    const dataLoadTables = respGetLoadTables;

    console.log("[2] - (Sucesso) - Carga do Load Tables recebida.\n");
    console.log("[3] - Salvando o Load Tables...\n");

    // Disparando pro MD (v2)
    await saveLoadTables(dataLoadTables);
    console.log("[3.1] - Novo Load Tables salvo!\n");

    let dataMessage = {};
    if (req.body && req.body.message) {
        dataMessage.message = `${req.body.message} - Total: ${respGetLoadTables.control.tableImage.length}`
    } else {
        dataMessage.message = `Mid. (v2) [Loadtables] executado - Total: ${respGetLoadTables.control.tableImage.length}`;
    }

    dataMessage.date = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss");
    console.log("[4] - Salvando log da execução!\n");

    let dataStatus = {
        mensagem: dataMessage.message,
        data: dataLoadTables.status
    }

    let respMd = await utilMd.sendDataMd(dataStatus, "SL");
    if (respMd.status == "201") {
        console.log("[4.1] - Log salvo!\n");
        res.json({
            message: dataMessage.message,
            status: respMd.status
        });
    } else {
        console.log("[4.1] - Log não salvo!\n");
        res.json({
            message: dataMessage.message,
            status: respMd.status
        });
    }

    console.log("[END] - Middleware [LOADTABLES] - Interplayers encerrado.\n");
});

// Action: Busca a carga do load tables
const getLoadTables = async (token) => {
    let tokenAcess = `Bearer ${token}`;
    let config = {
        method: "post",
        url: "https://apivarejo.interplayers.com.br/attendance/integration/v2/loadTables",
        headers: {
            "Version": "1",
            "Authorization": tokenAcess,
            "Content-Type": "application/json"
        },
        data: JSON.stringify({
            control: {
                clientId: prodCredentials.clientId,
                username: prodCredentials.username,
                tableId: "1",
                localNumber: "",
                localHour: utilDate.getFormatedDateInISO(),
                industryId: "999",
                stationId: "",
                companyCode: prodCredentials.companyCode,
                tableVersion: "",
                tableImage: ""
            }
        })
    }
    return axios(config);
}

// Action: Salvo o Loadtables diario 
const saveLoadTables = (dataLt) => {
    let searchDate = new Date();
    searchDate = (searchDate.toLocaleString()).toString();
    let dataJson = {
        tableid: dataLt.control.tableId,
        databusca: searchDate,
        statustext: dataLt.informativeText,
        status: dataLt.status.toString(),
        retcod: dataLt.returnCode,
        loadtablesjson: JSON.stringify(dataLt)
    }

    let configs = {
        method: "post",
        url: `${dm.vtex}/${dm.vtexmdapi}/LT/documents`,
        headers: headersVtex,
        data: JSON.stringify(dataJson)
    };

    return axios(configs);
}

module.exports = router;