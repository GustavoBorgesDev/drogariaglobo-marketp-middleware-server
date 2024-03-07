const express = require("express");
const router = express.Router();
const axios = require("axios");
const headersVtex = require("../configs/vtex-headers");
const dm = require("../configs/domains");
const cron = require('node-cron');

// Neste caso, '0 6 * * *' significa todos os dias às 6 da manhã
cron.schedule('10 6 * * *', () => {
    runClearProds();
});

const runClearProds = async () => {
    console.log("\n\n[1 - Init] - Buscando todos produtos com PBM.\n");

    let listProductsSearched = await getAllProductsPBM();

    console.log(`[2 - Done] - Produtos com PBM recuperados. Total: ${listProductsSearched.length}\n`);
    if (listProductsSearched.length == 0) {
        res.json({
            message: "Encerrado por nao ter nenhum produto com PBM.",
            total: listProductsSearched.length
        });
    }

    await clearSpecificationFields(listProductsSearched);

    console.log("[3 - Done] - Especificações limpas.\n\n");
    console.log("[END] - Middleware de limpeza executado com sucesso e encerrado. ======.");
}

router.post("/middleware/v2/run-clear-all-products", async (req, res) => {
    try {
        res.json({
            message: "Sucesso!"
        });
    }
    catch (e) {
        res.json({
            message: "Erro."
        });
    }
});


const getProdutcsHasPBM = async (rangeFrom, rangeTo) => {
    let config = {
        method: "get",
        url: `${dm.vtex}/api/catalog_system/pub/products/search?_from=${rangeFrom}&_to=${rangeTo}&fq=specificationFilter_44:S`,
        headers: headersVtex
    }
    return axios(config);
}

const getAllProductsPBM = async () => {
    let ended = true;
    let count = 0;
    let total = [];
    let rangeFrom = 1;
    let rangeTo = 50;
    while (ended) {
        console.log(`\nRange ${rangeFrom} - ${rangeTo}\n`);
        let respSpec = await getProdutcsHasPBM(rangeFrom, rangeTo);
        if (respSpec.data.length) {
            console.log("Response: ", respSpec.data.length);
            console.log("Total: ", total.length);
            total = total.concat(respSpec.data);
            rangeFrom = rangeFrom + 50;
            rangeTo = rangeTo + 50;
        } else if (respSpec.data.length == 0 && respSpec.data.length < 50) {
            ended = false;
            break;
        }
        count++;
    }
    return total;
}


const clearSpecificationFields = async (listToClear) => {
    let filtered = [];
    for (let i = 0; i < listToClear.length; i++) {
        let updatedProductInfo = [
            {
                "Value": [
                    ''
                ],
                "Id": 43,
                "Name": "requestHolderId"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 44,
                "Name": "productPbmOn"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 45,
                "Name": "requestCoupon"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 46,
                "Name": "eanCombos"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 47,
                "Name": "industryName"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 48,
                "Name": "todayTableId"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 49,
                "Name": "formattedPrice"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 50,
                "Name": "standardPrice"
            },
            {
                "Value": [
                    ''
                ],
                "Id": 51,
                "Name": "discountType"
            }
        ]
        try {
            console.log("\n[5.1] - Atualizando especificação...");
            await updateProductSpecification(listToClear[i].productId, updatedProductInfo);
            console.log(`[${i}] - EAN: ${listToClear[i].ean} atualizado.\n`);
            filtered.push({
                ean: listToClear[i].ean,
                name: listToClear[i].name
            });
            console.log("[5.2] - Especificação atualizada!\n");
        } catch (e) {
            console.log("[5.3] - Especificação não atualizada: ", listToClear[i].id);
            console.log(e.message);
        }
    }
    return filtered;
}

const updateProductSpecification = async (id, specification) => {
    let endpoint = `${dm.vtex}/${dm.vtexcatalogapi}/pvt/products/${id}/specification`;
    let config = {
        method: "post",
        url: endpoint,
        headers: headersVtex,
        data: specification
    }
    return axios(config);
}

const findEanInLT = (EAN, ltList) => {
    let result = ltList.find(item => {
        return item.ean == EAN;
    });
    return result;
}

module.exports = router;