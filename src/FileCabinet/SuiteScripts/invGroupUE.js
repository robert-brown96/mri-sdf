/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    "N/render",
    "N/search",
    "N/record",
    "N/ui/serverWidget",
    "N/query",
    "./Lib/lodash.min"
], (render, search, record, serverWidget, query, _) => {
    /**
     * Defines the function definition that is executed before record is loaded.
     * @param {Object} context
     * @param {Record} context.newRecord - New record
     * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
     * @param {Form} context.form - Current form
     * @param {ServletRequest} context.request - HTTP request information sent from the browser for a client action only.
     * @since 2015.2
     */
    const beforeLoad = context => {
        try {
            if (
                context.type !== "print" &&
                context.type !== context.UserEventType.EDIT
            )
                return;

            let lineItems = generateLineItems(context);

            let custField = context.form.addField({
                id: "custpage_line_items",
                label: "Lines",
                type: serverWidget.FieldType.LONGTEXT
            });

            log.debug({
                title: "lines",
                details: lineItems
            });

            custField.defaultValue = lineItems;
        } catch (e) {
            log.error({
                title: "ERROR " + context.newRecord,
                details: e
            });
        }
    };

    const generateLineItems = context => {
        let filters = [];

        // filter based on grouped to field on Invoice
        filters.push(
            search.createFilter({
                name: "groupedto",
                operator: search.Operator.ANYOF,
                values: context.newRecord.id
            })
        );
        // filter out main line and tax lines
        filters.push(
            search.createFilter({
                name: "mainline",
                operator: search.Operator.IS,
                values: false
            })
        );
        filters.push(
            search.createFilter({
                name: "taxline",
                operator: search.Operator.IS,
                values: false
            })
        );
        let columns = [
            "custcol_scg_app_period",
            "custcol_scg_billing_pres",
            "custcol_scg_do_not_bundle",
            "quantity",
            "amount",
            "fxamount",
            "custcol_oa_date",
            "custcol_oa_employee",
            "custcol_oa_project_name",
            "custcol_oa_task_name",
            "custcol_oa_notes",
            "custcol_oa_hours",
            "custcol_oa_total",
            "custcol_scg_sow",
            "custcol_oa_expense_type",
            "custbody_oa_invoice_number",
            "item",
            "memo",
            "custcol_rev_rec_start_date",
            "custcol_rev_rec_end_date",
            "custbody_scg_tm_oa"
        ];
        let searchResults = search
            .create({
                type: search.Type.TRANSACTION,
                columns: columns,
                filters: filters
            })
            .run()
            .getRange(0, 1000);

        log.debug({
            title: "Results",
            details: searchResults
        });
        let lineItems = [];
        let productLines = [];
        let serviceLines = [];
        let nonBundled = [];

        _.forEach(searchResults, result => {
            if (result.getValue("custbody_oa_invoice_number")) {
                if (result.getValue("custbody_scg_tm_oa")) {
                    let i = result.getValue("item");
                    log.debug("Service item", i);
                    //only run for the OA integration item
                    if (i === "4174") {
                        serviceLines.push({
                            hours: result.getValue("custcol_oa_hours"),
                            amount: result.getValue("custcol_oa_total"),
                            oa_date: result.getValue("custcol_oa_date"),
                            project: result.getValue("custcol_oa_project_name"),
                            task: result.getValue("custcol_oa_task_name"),
                            employee: result.getValue("custcol_oa_employee"),
                            notes: result
                                .getValue("custcol_oa_notes")
                                .replace("@", "at"),
                            sow: result.getValue("custcol_scg_sow"),
                            item: result.getValue("item")
                        });
                    }
                } else {
                    nonBundled.push({
                        quantity: result.getValue("quantity"),
                        amount: result.getValue("fxamount"),
                        memo: result.getValue("memo").replace("@", "at"),
                        period: `${result.getValue(
                            "custcol_rev_rec_start_date"
                        )} - ${result.getValue("custcol_rev_rec_end_date")}`
                    });
                }
            } else if (result.getValue("custcol_scg_do_not_bundle")) {
                // create as non bundled item
                if (result.getValue("fxamount") !== 0) {
                    nonBundled.push({
                        quantity: result.getValue("quantity"),
                        amount: result.getValue("fxamount"),
                        memo: result.getValue("memo").replace("@", "at"),
                        period: `${result.getValue(
                            "custcol_rev_rec_start_date"
                        )} - ${result.getValue("custcol_rev_rec_end_date")}`
                    });
                }
            } else {
                // standard invoice line item
                productLines.push({
                    quantity: result.getValue("quantity"),
                    amount: result.getValue("fxamount"),
                    billing_pres: result.getValue("custcol_scg_billing_pres"),
                    period: `${result.getValue(
                        "custcol_rev_rec_start_date"
                    )} - ${result.getValue("custcol_rev_rec_end_date")}`
                });
            }
        });

        // group standard lines together
        let product_grouped = _.groupBy(productLines, "billing_pres");
        _.forOwn(product_grouped, (value, key) => {
            // sum line item amounts
            let pres = key;
            let periodGrouped = _.groupBy(value, "period");
            _.forOwn(periodGrouped, (v, k) => {
                let amount = _.reduce(
                    v,
                    (s, a) => {
                        return s + Number(a.amount);
                    },
                    0
                );
                if (amount !== 0) {
                    //format amount
                    let samount = String(
                        amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
                    );
                    log.debug({
                        title: "string amount",
                        details: samount
                    });
                    lineItems.push({
                        billing_pres: pres,
                        quantity: 1,
                        period: k,
                        amount: samount
                    });
                }
            });
        });

        let r = {
            lineItemsObj: lineItems
        };
        let tempArray = [];
        let serviceItemArray = [];

        //combine fields with @ and push to arrays

        _.forEach(lineItems, l => {
            let line = String(
                l.period +
                    "@" +
                    l.billing_pres +
                    "@" +
                    l.quantity +
                    "@" +
                    l.amount
            );
            tempArray.push(line);
        });

        _.forEach(nonBundled, n => {
            let smount = String(
                Number(n.amount)
                    .toFixed(2)
                    .replace(/\d(?=(\d{3})+\.)/g, "$&,")
            );
            let line = String(n.period + "@" + n.memo + "@" + 1 + "@" + smount);
            tempArray.push(line);
        });

        _.forEach(serviceLines, s => {
            let smount = String(
                Number(s.amount)
                    .toFixed(2)
                    .replace(/\d(?=(\d{3})+\.)/g, "$&,")
            );
            let line = String(
                s.oa_date + "@" + s.notes + "@" + s.hours + "@" + smount
            );
            tempArray.push(line);
        });

        log.debug({
            title: "Non Bundled",
            details: nonBundled
        });
        log.debug({
            title: "Service Lines",
            details: serviceLines
        });
        log.debug({
            title: "Product Lines",
            details: r
        });

        // join lines with |

        return tempArray.join("|");
    };

    const afterSubmit = context => {
        try {
            if (context.type === "edit" || context.type === "create") {
                const groupRec = context.newRecord;
                const invSub = groupRec.getValue("subsidiary");
                const invCurr = groupRec.getValue("currency");

                let mySearch = search.load({
                    id: "customsearch_scg_remittance_info_searc_2"
                });

                const subFilter = search.createFilter({
                    name: "custrecord_subsidiary_2",
                    operator: search.Operator.IS,
                    values: [invSub]
                });

                const currFilter = search.createFilter({
                    name: "custrecord_currency",
                    operator: search.Operator.IS,
                    values: [invCurr]
                });

                mySearch.filters.push(subFilter);
                mySearch.filters.push(currFilter);

                const myResults = mySearch.run().getRange(0, 1000);

                let remitRec;
                if (myResults[0]) {
                    remitRec = myResults[0].getValue("internalid");

                    log.debug("remitRec", remitRec);
                }
                const custrecord_account_name = myResults[0].getValue(
                    "custrecord_account_name"
                );
                const custrecord_bank_name = myResults[0].getValue(
                    "custrecord_bank_name"
                );
                const custrecord_bank_sort_code = myResults[0].getValue(
                    "custrecord_bank_sort_code"
                );
                const custrecord_bank_address = myResults[0].getValue(
                    "custrecord_bank_address"
                );
                const custrecord_bsb = myResults[0].getValue("custrecord_bsb");
                const custrecord_accountnum = myResults[0].getValue(
                    "custrecord_accountnum"
                );
                const custrecord_swift_code = myResults[0].getValue(
                    "custrecord_swift_code"
                );

                if (!remitRec) {
                    log.debug("USING DEFAULT", invSub);
                    switch (invSub) {
                        case "2": //us
                            remitRec = 1;
                            break;
                        case "3": //canada
                            remitRec = 28;
                            break;
                        case "4": //uk
                            remitRec = 30;
                            break;
                        case "5": //ireland
                            remitRec = 52;
                            break;
                        case "6": //south africa
                            remitRec = 53;
                            break;
                        case "17": //UAE
                            remitRec = 55;
                            break;
                        case "7": // australia
                            remitRec = 56;
                            break;
                        case "8": // singapore
                            remitRec = 64;
                            break;
                        case "11": // japan
                            remitRec = 72;
                            break;
                        case "9": // new zealand
                            remitRec = 66;
                            break;
                        case "10": // hong kong
                            remitRec = 69;
                            break;
                        default:
                            log.error({
                                title: "CANNOT FIND DEFAULT REMITTANCE",
                                details: subFilter
                            });
                            break;
                    }
                }
                let subFields = search.lookupFields({
                    type: search.Type.SUBSIDIARY,
                    id: invSub,
                    columns: ["country"]
                });
                subFields = subFields.country[0].text;
                log.debug(subFields);
                const existingEmails = groupRec.getValue(
                    "custrecord_invoice_email_address_list"
                );
                let newEmails;
                let delType;
                if (!existingEmails || context.type === "create") {
                    const billAddRec = groupRec.getValue({
                        fieldId: "billaddresslist"
                    });
                    const cus = groupRec.getValue({
                        fieldId: "customer"
                    });
                    if (billAddRec) {
                        const q = `SELECT
                                      c.id,
                                      bt.custrecord_scg_address_email as email,
                                      bt.custrecord_scg_a_email_list as additionalEmail
                                    FROM
                                      Customer c
                                      LEFT OUTER JOIN EntityAddressbook as b ON (b.Entity = c.ID)
                                      LEFT OUTER JOIN EntityAddress as bt ON (bt.nkey = b.AddressBookAddress)
                                    WHERE
                                      b.internalid = ${billAddRec}`;

                        const res = query.runSuiteQL(q).asMappedResults();
                        if (res.length > 0) {
                            const { email, additionalEmail } = res[0];
                            log.debug("email", res);
                            let emails;
                            if (!isEmpty(additionalEmail)) {
                                emails = email + "," + additionalEmail;
                            } else {
                                emails = email;
                            }
                            log.debug({
                                title: "Emails:",
                                details: emails
                            });
                            if (emails) {
                                newEmails = emails;
                                delType = ["1"];
                            }
                        }
                    }
                }
                record.submitFields({
                    type: "invoicegroup",
                    id: groupRec.id,
                    values: {
                        custrecord_remittance_information: remitRec,
                        custrecord_inv_group_country: subFields,
                        custrecord_scg_g_account_name: custrecord_account_name,
                        custrecord_scg_bank_name: custrecord_bank_name,
                        custrecord_scg_group_sort_code:
                            custrecord_bank_sort_code,
                        custrecord_scg_group_b_address: custrecord_bank_address,
                        custrecord_scg_group_bsb: custrecord_bsb,
                        custrecord_scg_group_acc_num: custrecord_accountnum,
                        custrecord_scg_group_swift: custrecord_swift_code,
                        ...(newEmails && {
                            custrecord_invoice_email_address_list: newEmails
                        }),
                        ...(delType && {
                            custrecord_invoice_delivery_type: delType
                        })
                    }
                });
            }
        } catch (e) {
            log.error({
                title: "Error in after submit",
                details: e
            });
        }
    };

    function isEmpty(stValue) {
        if (stValue == "" || stValue == null || stValue == undefined) {
            return true;
        }

        return false;
    }

    return { beforeLoad, afterSubmit };
});
