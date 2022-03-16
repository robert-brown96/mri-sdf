/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
    "N/render",
    "N/search",
    "N/record",
    "N/ui/serverWidget",
    "./Lib/lodash.min"
], (render, search, record, serverWidget, _) => {
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
                operator: search.Operator.IS,
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
            "item"
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
            if (result.getValue("custcol_scg_do_not_bundle")) {
                // create as non bundled item
                if (result.getValue("amount") !== 0) {
                    nonBundled.push({
                        quantity: result.getValue("quantity"),
                        amount: result.getValue("amount"),
                        memo: result.getValue("description"),
                        period: result.getValue("custcol_scg_app_period")
                    });
                }
            } else if (result.getValue("custbody_oa_invoice_number")) {
                let i = result.getValue("item");
                log.debug("Service item", i);
                //only run for the OA integration item
                if (i === "10079") {
                    serviceLines.push({
                        hours: result.getValue("custcol_oa_hours"),
                        amount: result.getValue("custcol_oa_total"),
                        oa_date: result.getValue("custcol_oa_date"),
                        project: result.getValue("custcol_oa_project_name"),
                        task: result.getValue("custcol_oa_task_name"),
                        employee: result.getValue("custcol_oa_employee"),
                        notes: result.getValue("custcol_oa_notes"),
                        sow: result.getValue("custcol_scg_sow"),
                        item: result.getValue("item")
                    });
                }
            } else {
                // standard invoice line item
                productLines.push({
                    quantity: result.getValue("quantity"),
                    amount: result.getValue("amount"),
                    billing_pres: result.getValue("custcol_scg_billing_pres"),
                    period: result.getValue("custcol_scg_app_period")
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
                    "" +
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
                n.amount.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, "$&,")
            );
            let line = String(
                n.period + "@" + n.memo + "@" + n.quantity + "@" + smount
            );
            tempArray.push(line);
        });

        _.forEach(serviceLines, s => {
            let smount = String(
                Number(s.amount)
                    .toFixed(2)
                    .replace(/\d(?=(\d{3})+\.)/g, "$&,")
            );
            let line = String(
                s.oa_date +
                    "@" +
                    s.project +
                    "@" +
                    s.notes +
                    "@" +
                    s.hours +
                    "@" +
                    smount
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

    return { beforeLoad };
});
