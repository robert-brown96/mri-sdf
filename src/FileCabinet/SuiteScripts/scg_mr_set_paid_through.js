/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 *
 * Version  Date            Author           Remark
 * 1.00     3/3/21     Bobby Brown      Takes Search data, and sets paid through date on subscription items
 * 1.1      3/4/21    Bobby Bronw       Added logic to handle restarts
 */

define(["N/record", "N/search", "N/runtime", "N/format"], function (
    record,
    search,
    runtime,
    format
) {
    const PAID_THRU_DATE = "custrecord_scg_paid_through";
    const SUBSCRIPTION_ITEM = "customrecordzab_subscription_item";
    const CHARGE = "customrecordzab_charge";
    const LAST_UPDATE = "custrecord_scg_mr_handling";

    function getInputData() {
        try {
            log.debug("Start GetInputData");

            //Find data
            //Get listing of unpaid charges
            // var inputSearch = search.load({
            //     id:'customsearch_scg_mr_payments'
            // });

            var customrecordzab_chargeSearchObj = search.create({
                type: "customrecordzab_charge",
                filters: [
                    ["custrecordzab_c_status", "anyof", "4"],
                    "AND",
                    ["custrecordzab_c_customer", "anyof", "@ALL@"],
                    "AND",
                    [
                        "formuladate: {custrecordzab_c_transaction.custbody_scg_inv_paid}",
                        "isempty",
                        ""
                    ],
                    "AND",
                    [
                        "custrecordzab_c_subscription_item.custrecord_scg_mr_handling",
                        "noton",
                        "today"
                    ],
                    "AND",
                    ["custrecord_scg_asset_id", "isnotempty", ""]
                ],
                columns: [
                    search.createColumn({
                        name: "custrecord_scg_asset_id",
                        summary: "GROUP"
                    }),
                    search.createColumn({
                        name: "formulanumeric",
                        summary: "GROUP",
                        formula:
                            "{custrecordzab_c_subscription_item.internalid}"
                    }),
                    search.createColumn({
                        name: "custrecordzab_c_charge_period_start_date",
                        summary: "MIN"
                    })
                ]
            });

            //            var result = inputSearch.run().getRange({
            //              start: 0,
            //            end: 1000
            //      });

            return customrecordzab_chargeSearchObj;
        } catch (e) {
            log.error({
                title: "Error in GetInputData",
                details: e
            });
        } finally {
            log.debug("Finish GetInputData");
        }
    } //end get input data
    /**
     *
     * @param {object} context
     * @param {object} context.value
     */
    function map(context) {
        try {
            log.debug("Start map");
            log.debug(context);
            //Suiteanswer 89821
            var mapData = JSON.parse(context.value);
            var mapDataValues = mapData.values;

            var stringifyValues = JSON.stringify(mapDataValues);
            var cleanString = stringifyValues.replace(/[()]/g, "");
            var newObject = JSON.parse(cleanString);
            log.debug({
                title: "Values1",
                details: newObject
            });

            var subItem = newObject.GROUPformulanumeric;

            var paidDate =
                newObject.MINcustrecordzab_c_charge_period_start_date;

            log.debug({
                title: "Parsed Data",
                details: subItem + " " + paidDate
            });

            context.write({
                key: subItem,
                value: paidDate
            });
        } catch (e) {
            log.error({
                title: "Error in map",
                details: e
            });
        } finally {
            log.debug("Finish map");
        }
    } //end map
    /**
     *
     * @param {object} context
     * @param {string} context.key
     * @param {string} context.values
     */
    function reduce(context) {
        try {
            log.debug("Start reduce");

            //get today
            var today = new Date();
            today = format.parse({
                value: today,
                type: format.Type.DATE
            });
            log.debug({
                title: "today",
                details: today
            });

            var subItem = record.load({
                type: SUBSCRIPTION_ITEM,
                id: context.key
            });
            var alreadyProcessed = false;
            if (context.isRestarted) {
                var check = subItem.getValue({
                    fieldId: LAST_UPDATE
                });
                if (check == today) {
                    alreadyProcessed = true;
                }
            }
            if (!alreadyProcessed) {
                log.debug(context.values);
                var paidDate = new Date(context.values[0]);
                paidDate.setDate(paidDate.getDate() - 1);
                log.debug(paidDate);

                var existingDate = subItem.getValue({
                    fieldId: PAID_THRU_DATE
                });
                if (existingDate != paidDate) {
                    subItem.setValue({
                        fieldId: PAID_THRU_DATE,
                        value: paidDate
                    });

                    subItem.setValue({
                        fieldId: LAST_UPDATE,
                        value: today
                    });
                    subItem.save();

                    context.write({
                        key: context.key,
                        value: context.values.length
                    });
                }
            }
        } catch (e) {
            log.error({
                title: "Error in reduce",
                details: e
            });
        } finally {
            log.debug("Finish reduce");
        }
    } //end reduce

    function summarize(summary) {
        var totalRecordsUpdated = 0;

        try {
            log.debug({
                title: "Start summarize",
                details: summary
            });

            summary.output.iterator().each(function (key, value) {
                log.audit({
                    title: key + " records updated",
                    details: value
                });
                totalRecordsUpdated += parseInt(value);
                return true;
            });
            log.audit({
                title: "Total Records Updated",
                details: totalRecordsUpdated
            });
        } catch (e) {
            log.error({
                title: "Error in summarize",
                details: e
            });
        } finally {
            log.debug({
                title: "Usage Units",
                details: summary.usage
            });
            log.debug({
                title: "Concurrency",
                details: summary.concurrency
            });
            log.debug({
                title: "Yields",
                details: summary.yields
            });
            log.debug("Finish summarize");
        }
    } //end summarize

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}); //end all
