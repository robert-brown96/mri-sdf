/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Bobby Brown
 */
define([
    "N/search",
    "N/record",
    "/SuiteScripts/Lib/_scg_zab_lib.js",
    "SuiteScripts/Lib/lodash.min",
    "SuiteScripts/Lib/moment.min"
], function (search, record, CONSTANTS, _, moment) {
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @function getInputData
     * @return {Array|Object|Search|ObjectRef} inputSummary
     */
    const getInputData = () => {
        try {
            // log.debug("START", "Get Input Data");
            // //get subscriptions for processing
            // var subSearch = search.load({
            //     id: "customsearch_scg_mr_arr_sea"
            // });

            //send results to map stage
            return search.create({
                type: "customrecordzab_subscription",
                filters: [
                    [
                        "custrecordzab_s_customer.custentity_mri_cus_arrep",
                        "anyof",
                        "@NONE@"
                    ],
                    "AND",
                    [
                        "custrecordzab_s_customer.custentity_scg_arr_dum",
                        "anyof",
                        "@NONE@"
                    ]
                ],
                columns: [
                    "id",
                    "custrecordzab_s_location",
                    "custrecordzab_s_subsidiary",
                    search.createColumn({
                        name: "custrecordzab_cd_rate",
                        join: "CUSTRECORDZAB_CD_SUBSCRIPTION"
                    }),
                    search.createColumn({
                        name: "custrecordzab_cd_item",
                        join: "CUSTRECORDZAB_CD_SUBSCRIPTION"
                    }),
                    search.createColumn({
                        name: "custrecordzab_si_rate",
                        join: "CUSTRECORDZAB_SI_SUBSCRIPTION"
                    }),
                    search.createColumn({
                        name: "custrecordzab_si_item",
                        join: "CUSTRECORDZAB_SI_SUBSCRIPTION"
                    }),
                    search.createColumn({
                        name: "name",
                        sort: search.Sort.ASC
                    }),
                    "custrecordzab_s_customer"
                ]
            });
        } catch (e) {
            //end try
            log.error({
                title: "Get Input Error",
                details: e
            });
        } finally {
            log.debug("End Get Input");
        }
    }; //end get input
    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     * After parsing search result,
     *
     *
     * @function map
     * @param context {mapReduceContext}- Data collection containing the key/value pairs to process through the map stage
     * @param context.value {searchResult}
     * @param context.key {string}
     *
     * @method context.write
     * @return {void}
     */
    const map = context => {
        try {
            const searchResult = JSON.parse(context.value);
            //log.debug("---- Start map ----", "");
            // log.debug('context', searchResult);

            let subId = JSON.parse(context.value).id;
            let location = searchResult.values.custrecordzab_s_location.value;
            log.debug({ title: "MAP DATA", details: searchResult });
            let rate;
            let item;
            let contractGroup;
            let customer = searchResult.values.custrecordzab_s_customer.value;

            if (location == 5) {
                //RHR
                contractGroup = 42;
            } else if (location == 203) {
                //rescheck
                contractGroup = 44;
            } else if (location == 202) {
                //cal/max
                contractGroup = 4;
                rate =
                    searchResult.values[
                        "custrecordzab_cd_rate.CUSTRECORDZAB_CD_SUBSCRIPTION"
                    ];
            } else {
                //sub item check
                item =
                    searchResult.values[
                        "custrecordzab_cd_item.CUSTRECORDZAB_CD_SUBSCRIPTION"
                    ];
                if (item) {
                    item = item.value;
                    rate =
                        searchResult.values[
                            "custrecordzab_cd_rate.CUSTRECORDZAB_CD_SUBSCRIPTION"
                        ];
                } else {
                    item =
                        searchResult.values[
                            "custrecordzab_si_item.CUSTRECORDZAB_SI_SUBSCRIPTION"
                        ].value;
                    rate =
                        searchResult.values[
                            "custrecordzab_si_rate.CUSTRECORDZAB_SI_SUBSCRIPTION"
                        ];
                }
                let lookupValues = search.lookupFields({
                    type: search.Type.ITEM,
                    id: item,
                    columns: ["custitem_scg_contract_group"]
                });

                contractGroup =
                    lookupValues.custitem_scg_contract_group[0].value;
                log.debug(contractGroup);
            }

            context.write({
                key: subId,
                value: {
                    rate: rate,
                    contractGroup: contractGroup,
                    customer: customer
                }
            });
        } catch (e) {
            log.error({
                title: "Error in map",
                details: e
            });
            throw e;
        }
    }; //end map
    /**
     * Executes when the reduce entry point is triggered and applies to each group.
     *
     *
     *
     * @function reduce
     * @param context {ReduceContext} Data collection containing the groups to process through the reduce stage
     * @param context.key - {String} ID of Subscription
     * @param context.values {object[]} Count records to be reduced
     * @return {void}
     */

    const reduce = context => {
        try {
            log.debug({
                title: "Start reduce for: " + context.key,
                details: context.values
            });

            let parsedRecs = [];
            _.forEach(context.values, obj => {
                parsedRecs.push(JSON.parse(obj));
            });
            _.forEach(context.values, obj => {
                let data = JSON.parse(obj);
                let rate = Number(data.rate);
                parsedRecs.push({
                    contractGroup: data.contractGroup,
                    rate: rate,
                    customer: data.customer
                });
            });

            const n = _(parsedRecs)
                .groupBy("contractGroup")
                .mapValues(entries => _.sumBy(entries, i => Number(i.rate)))
                .map((rate, contractGroup) => ({ rate, contractGroup }))
                .maxBy("rate").contractGroup;

            log.debug({
                title: "Grouped Sums",
                details: n
            });

            const maxArr = n;

            let cusId = parsedRecs[0].customer;
            let subId = context.key;
            log.debug({
                title: "Contracting Group",
                details: maxArr
            });
            if (maxArr) {
                let arRep = search.lookupFields({
                    type: "customrecord_scg_contract_groups",
                    id: maxArr,
                    columns: ["custrecord_scg_ar_rep"]
                });
                let arRepId = arRep.custrecord_scg_ar_rep[0];
                record.submitFields({
                    type: record.Type.CUSTOMER,
                    id: cusId,
                    values: {
                        ...(arRepId && {
                            custentity_mri_cus_arrep: arRepId.value
                        }),
                        custentity_scg_arr_dum: maxArr
                    }
                });
            }

            context.write({
                key: subId,
                values: context.values.length
            });
        } catch (e) {
            log.error({
                title: "Error in reduce",
                details: e
            });
            throw e;
        }
    }; //end reduce
    /**
     * @function summarize
     * @param summary
     * @param summary.inputSummary
     * @param summary.mapSummary
     * @param summary.reduceSummary
     * @param summary.output
     * @param summary.isRestarted {boolean}
     * @param summary.seconds - Script run time
     * @param summary.yields - Number of yields
     *
     */
    const summarize = summary => {
        log.debug(summary.reduceSummary, summary);

        if (summary.isRestarted) {
            log.audit("Summary Stage is being Restarted");
        }

        //get total records updated in run
        var totalRecordsUpdated = 0;
        summary.output.iterator().each(function (key, value) {
            totalRecordsUpdated += parseInt(value);
            return true;
        });
        log.audit({
            title: "Assigned " + totalRecordsUpdated + " AR Reps",
            details:
                "Time(in seconds): " +
                summary.seconds +
                " with " +
                summary.yields +
                " yields"
        });

        // If an error was thrown during the input stage, log the error.

        if (summary.inputSummary.error) {
            log.error({
                title: "Input Error",
                details: summary.inputSummary.error
            });
        }

        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.mapSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                log.error({
                    title:
                        "Map error for key: " +
                        key +
                        ", execution no.  " +
                        executionNo,
                    details: error
                });
                return true;
            });

        // For each error thrown during the reduce stage, log the error, the corresponding
        // key, and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.reduceSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                log.error({
                    title:
                        "Reduce error for key: " +
                        key +
                        ", execution no. " +
                        executionNo,
                    details: error
                });
                return true;
            });
    }; //end summary

    return {
        getInputData: getInputData,
        map: map,
        reduce: reduce,
        summarize: summarize
    };
}); //end
