const express = require("express");
const router = express.Router();
const axios = require("axios");
const headersVtex = require("../configs/vtex-headers");
const dm = require("../configs/domains");

let moment = require("moment");
let mmtz = require('moment-timezone');
moment.locale("pt-br");
mmtz.tz('America/Sao_Paulo');

// Utils
const utilMd = require("../utils/sendDataMd");

router.post("/middleware/v2/run-middleware-update-specifications", async (req, res) => {

    console.log("\n\n\n----- [controller.specifications.js] ----- \n");
    console.log("----- INICIANDO MIDDLWARE VTEX ----- \n\n\n");
    console.log("[1] - Buscando o Load Tables desse dia no MD...\n");

    const respLt = await getLoadTablesToday();
    
    // Pego o ultimo item criado, sempre na posição ZERO [0] - respLt[0]
    if (respLt.status != 200 || respLt.data[0].length == []) {
        res.json({
            message: "Nenhuma carda localizada hoje."
        });
        return;
    }

    console.log("[1] - (Sucesso) - Load Tables do MD buscado.\n");
    let ltObj = JSON.parse(respLt.data[0].loadtablesjson);
    const listProductsEAN = ltObj.control;
    console.log("[2] - Buscando os EAN's existentes...\n");
    const respListProductsOn = await getAllProductsByEAN(listProductsEAN);
    console.log(`\n[2] - (Sucesso) - EAN's do programa verificados. Total: ${respListProductsOn.eanValided.length} \n`);

    res.json({
        develop: true
    })
    return;
    console.log("[3] - Atualizando as especificações dos Produtos...\n");
    const respSpecs = await updateEANspecifications(respListProductsOn);
    console.log("Total EAN: ", respSpecs.length);
    console.log(`[3] - (Sucesso) - Todos EAN's atualizados.\n`);

    let dataMessage = {};
    if (req.body && req.body.message) {
        dataMessage.message = `${req.body.message} - Total produtos: ${respSpecs.length}`;
    } else {
        dataMessage.message = "Mid. (v2) Specifications executado!";
    }

    dataMessage.date = moment().tz("America/Sao_Paulo").format("DD/MM/YYYY HH:mm:ss");

    console.log("[4] - Salvando log da execução!\n");

    let dataStatus = {
        mensagem: dataMessage.message,
        data: "200"
    }

    let respMd = await utilMd.sendDataMd(dataStatus, "SE");
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

    // const respAlive = await sendDataToMD(dataMessage);
    // if (respAlive.status == "201") {
    //     console.log("MD V2 - Dados Criados com sucesso!");
    //     console.log(respAlive.data);
    //     res.json({
    //         message: dataMessage.message,
    //         status: respAlive.status
    //     });
    // } else {
    //     console.log("MD V2 - Status diferente de 201: ", respAlive.status);
    //     res.json({
    //         message: dataMessage.message,
    //         status: respAlive.status
    //     });
    // }

    console.log("[END] - Middleware [SPECIFICATIONS] - Vtex encerrado.\n");
});

// Action: Pego o Load Tables Diario do MD (nosso backup)
const getLoadTablesToday = async () => {
    // const dt = getDate();
    //const tdRange = utilYestTodayDate.getDateTodayYesterday();
    //let tdCondition = `where=createdIn between ${tdRange.ydDate} AND ${tdRange.tdDate}&_fields=_all`;
    // let condition = `where=createdIn between ${dt.ydDate} AND ${dt.tdDate}&_fields=_all`;
    let newCondition = "_fields=loadtablesjson,createdIn&_sort=createdIn DESC";
    let configs = {
        method: "get",
        //url: `${dm.vtex}/api/dataentities/LT/search?_fields=_all`,
        url: `${dm.vtex}/api/dataentities/LT/search?${newCondition}`,
        // url: `https://drogariaglobo.myvtex.com/api/dataentities/loadtables/search?_${condition}`,
        headers: headersVtex
    }
    return axios(configs);
}

// Action: Busco todos os produtos pelo EAN
const getAllProductsByEAN = async (listEAN) => {
    let listEanValided = [];
    let listEanToSave = [];
    let countFounded = 0;
    let countNotFound = 0;

    for (let eanToVerify of listEAN.tableImage) {

        if (eanToVerify.ean == 7899706192712) {
            try {
    
                let respRequest = await getEAN(eanToVerify.ean);
                let respProdcutRequest = await getProductData(respRequest.data.ProductId);
                let dataProduct = respProdcutRequest.data[0];
    
                let vtexPrice = dataProduct.items[0].sellers[0].commertialOffer.Price;
                let vtexListPrice = dataProduct.items[0].sellers[0].commertialOffer.ListPrice;
    
                // let betterDiscount = findBestterDiscount(vtexPrice, eanToVerify);
                let betterDiscount = findBestterDiscount(vtexListPrice, eanToVerify);
                let betterDiscValue = betterDiscount.newPriceDiscount;
    
                if (typeof betterDiscValue === 'number') {
                    betterDiscValue = betterDiscValue.toString();
                }
    
                let formatedPrices = {
                    discountPrice: betterDiscValue,
                    discountPriceFormated: `R$ ${betterDiscValue.replace(".", ",")}`,
                    discountPercentage: betterDiscount.btDiscPercentage
                }
    
                let table = {
                    tableId: listEAN.tableId
                };
    
                let productId = {
                    id: dataProduct.productId
                }
    
                let infoCombo = null;
                if (
                    (eanToVerify.eanCombos.ean && eanToVerify.eanCombos.ean.length > 1) ||
                    (eanToVerify.eanCombos.ean && eanToVerify.eanCombos.ean.length == 1 && eanToVerify.eanCombos.ean[0] != "SEM DESCONTO COMBO")
                ) {
                    infoCombo = {
                        listCombos: eanToVerify.eanCombos.ean
                    }
                } else {
                    infoCombo = {
                        listCombos: "SEM DESCONTO COMBO"
                    }
                }
    
                let eanData = { ...eanToVerify, formatedPrices, table, productId, infoCombo };
    
                console.log(`[${countFounded}] - EAN: [${eanToVerify.ean}] foi organizado. Salvando para o proximo passo.`);
    
                listEanValided.push(eanData);
                listEanToSave.push(eanToVerify);
                countFounded++;
    
            } catch (e) {
                console.log(`EAN: ${eanToVerify.ean} não verificado.`);
                countNotFound++;
            }
        }

        
    }

    console.log("\nTotal de EAN's Não encontrados: ", countNotFound);

    return {
        eanValided: listEanValided,
        eanSaved: listEanToSave
    };
}

// Action: Atualiza as especificações do produto com as infos do PBM
const updateEANspecifications = async (listEAN) => {
    let listValided = [];
    let count = 0;
    for (let prod of listEAN.eanValided) {
        let updatedProductInfo = [
            {
                "Value": [
                    listEAN.eanSaved[count].requestHolderId
                ],
                "Id": 43,
                "Name": "requestHolderId"
            },
            {
                "Value": [
                    'S'
                ],
                "Id": 44,
                "Name": "productPbmOn"
            },
            {
                "Value": [
                    listEAN.eanSaved[count].requestCoupon
                ],
                "Id": 45,
                "Name": "requestCoupon"
            },
            {
                "Value": [
                    JSON.stringify(listEAN.eanValided[count].infoCombo)
                ],
                "Id": 46,
                "Name": "eanCombos"
            },
            {
                "Value": [
                    listEAN.eanSaved[count].industryName
                ],
                "Id": 47,
                "Name": "industryName"
            },
            {
                "Value": [
                    prod.table.tableId
                ],
                "Id": 48,
                "Name": "todayTableId"
            },
            {
                "Value": [
                    prod.formatedPrices.discountPrice
                ],
                "Id": 49,
                "Name": "formattedPrice"
            },
            {
                "Value": [
                    prod.formatedPrices.discountPriceFormated
                ],
                "Id": 50,
                "Name": "standardPrice"
            },
            {
                "Value": [
                    'B' // Ou L
                ],
                "Id": 51,
                "Name": "discountType"
            },
            {
                "Value": [
                    listEAN.eanSaved[count].informativeText
                ],
                "Id": 52,
                "Name": "informativeText"
            },
            {
                "Value": [
                    prod.formatedPrices.discountPercentage
                ],
                "Id": 53,
                "Name": "discountPercentage"
            }
        ]
        try {
            console.log("[3.2] - Atualizando especificação...");
            await updateProductSpecification(prod.productId.id, updatedProductInfo);
            listValided.push(listEAN.eanSaved[count].ean);
            console.log("[3.3] - Especificação atualizada!\n");
        } catch (e) {
            console.log("[3 - Erro] - Especificação não atualizada: ", prod.productId.id);
            console.log(e.data);
        }

        count++;
    }

    return listValided;
}

// Busco o EAN e verifico se existe na VTEX
const getEAN = async (ean) => {
    let config = {
        method: "get",
        url: `${dm.vtex}/${dm.vtexcatalogapi}/pvt/sku/stockkeepingunitbyean/${ean}`,
        headers: headersVtex
    }
    return axios(config);
}

// Busco informações do produto (Especificamente os preços)
const getProductData = async (id) => {
    let endpoint = `${dm.vtex}/${dm.vtexcatalogapi}/pub/products/search?fq=productId:${id}`;
    let config = {
        method: "get",
        url: endpoint,
        headers: headersVtex
    }
    return axios(config);
}

const updateProductSpecification = async (id, spec) => {
    let endpoint = `${dm.vtex}/${dm.vtexcatalogapi}/pvt/products/${id}/specification`;
    let config = {
        method: "post",
        url: endpoint,
        headers: headersVtex,
        data: spec
    }
    return axios(config);
}

const findBestterDiscount = (vtexPrice, eanData) => {
    let betterDiscount = null;
    let btDiscPercentage = '';
    let discountValue = null;
    let discountSelected = null;

    try {
        switch (true) {
            case Number(eanData.discountMax) > 0:
                console.log("CASE - A\n");
                discountValue = formatDiscount(eanData.discountMax).toFixed(2);
                betterDiscount = (vtexPrice * discountValue).toFixed(2);
                discountSelected = eanData.discountMax;
                break;
            case Number(eanData.discountMaxNewPatient) > 0:
                console.log("CASE - B\n");
                discountValue = formatDiscount(eanData.discountMaxNewPatient).toFixed(2);
                betterDiscount = (vtexPrice * discountValue).toFixed(2);
                discountSelected = eanData.discountMaxNewPatient;
                break;
            case Number(eanData.discountMin) > 0:
                console.log("CASE - C\n");
                discountValue = formatDiscount(eanData.discountMin).toFixed(2);
                betterDiscount = (vtexPrice * discountValue).toFixed(2);
                discountSelected = eanData.discountMin;
                break;
            case Number(eanData.discountAbsolute) > 0:
                console.log("CASE - E\n");
                console.log("VtexPrice: ", vtexPrice);
                console.log("Desconto: ", eanData.discountAbsolute);
                discountValue = formatDiscount(eanData.discountAbsolute).toFixed(2);
                betterDiscount = (vtexPrice * discountValue).toFixed(2);
                discountSelected = eanData.discountAbsolute;
                break;
            default:
                console.log("CASE - F\n");
                betterDiscount = vtexPrice;
        }
    
        let resultPrice = null;
        if (betterDiscount != vtexPrice) {
            btDiscPercentage = (Number(discountSelected) / 100).toFixed(2);
            btDiscPercentage = btDiscPercentage.split(".")[0];
            btDiscPercentage = btDiscPercentage + '%';

            // Valor Final
            resultPrice = (vtexPrice - betterDiscount).toFixed(2);
        } 
        // Se for igual
        else if (betterDiscount == vtexPrice) {
            // console.log("VtexPrice: ", vtexPrice)
            resultPrice = vtexPrice;
        } 
        // Se o valor do desconto da loja for maior que o do PBM considero o da loja
        else if (resultPrice > vtexPrice) {
            resultPrice = vtexPrice;
        } else {
            console.log("Cenario que nao sei.");
        }
        console.log("Desconto final: ", resultPrice);
        return {
            newPriceDiscount: resultPrice,
            btDiscPercentage: btDiscPercentage
        }
    }
    catch(e) {
        console.log(e.message)
    }

}

// Util: Pego a Data atual e Anterior já formada em ISO
const getDate = () => {
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

// Util: Formatado de casas decimais
const formatDiscount = (discount) => {
    let valueDiscount = discount / 100;
    valueDiscount = valueDiscount / 100;
    return valueDiscount;
}

module.exports = router;