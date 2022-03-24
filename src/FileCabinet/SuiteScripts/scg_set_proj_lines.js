/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Bobby Brown
 */
define(["N/record", "N/search", "./Lib/lodash.min"], (record, search, _) => {
    /**
     * Defines the function that is executed at the beginning of the map/reduce process and generates the input data.
     * @param {Object} inputContext
     * @param {boolean} inputContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Object} inputContext.ObjectRef - Object that references the input data
     * @typedef {Object} ObjectRef
     * @property {string|number} ObjectRef.id - Internal ID of the record instance that contains the input data
     * @property {string} ObjectRef.type - Type of the record instance that contains the input data
     * @returns {Array|Object|Search|ObjectRef|File|Query} The input data to use in the map/reduce process
     * @since 2015.2
     */
    const getInputData = inputContext => {
        try {
            // return search.load({
            //     id: "customsearch_scg_charge_proj"
            // });
            log.audit("START");

            return search.create({
                type: "customrecordzab_charge",
                filters: [
                    ["custrecordzab_c_status", "anyof", "4"],
                    "AND",
                    [
                        "custrecordzab_c_subscription_item.custrecordmri_si_sf_project_id",
                        "isnotempty",
                        ""
                    ],
                    "AND",
                    ["custrecordzab_c_charge_item.type", "anyof", "Service"],
                    "AND",
                    [
                        "custrecordzab_c_subscription_item.custrecord_scg_proj_on_tran",
                        "is",
                        "F"
                    ]
                ],
                columns: [
                    "custrecordzab_c_transaction",
                    "custrecordzab_c_transaction_line_id",
                    search.createColumn({
                        name: "custrecordzab_si_ns_proj",
                        join: "CUSTRECORDZAB_C_SUBSCRIPTION_ITEM"
                    }),
                    "custrecordzab_c_subscription_item"
                ]
            });
        } catch (e) {
            log.error({
                title: "Error in get input",
                details: e
            });
        }
    };

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} mapContext - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} mapContext.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} mapContext.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} mapContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} mapContext.key - Key to be processed during the map stage
     * @param {string} mapContext.value - Value to be processed during the map stage
     * @since 2015.2
     */
    const map = mapContext => {
        try {
            const searchResult = JSON.parse(mapContext.value);

            const mapData = searchResult.values;

            let so = mapData.custrecordzab_c_transaction.value;
            let soLine = mapData.custrecordzab_c_transaction_line_id;
            let subItemId = mapData.custrecordzab_c_subscription_item.value;
            let proj =
                mapData[
                    "custrecordzab_si_ns_proj.CUSTRECORDZAB_C_SUBSCRIPTION_ITEM"
                ];

            mapContext.write({
                key: so,
                value: {
                    project: proj,
                    soLine: Number(soLine) - 1,
                    subItem: subItemId
                }
            });
        } catch (e) {
            log.error({
                title: "MAP ERROR",
                details: e
            });
        }
    };

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} reduceContext - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} reduceContext.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} reduceContext.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} reduceContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} reduceContext.key - Key to be processed during the reduce stage
     * @param {List<String>} reduceContext.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    const reduce = reduceContext => {
        try {
            let salesOrder = record.load({
                type: record.Type.SALES_ORDER,
                id: reduceContext.key,
                isDynamic: true
            });

            _.forEach(reduceContext.values, rec => {
                /**
                 *
                 * @typedef {Object} lineData
                 * @property {number} soLine
                 * @property {number} project
                 * @property {number} subItem
                 */
                let lineData = JSON.parse(rec);
                log.debug({
                    title: "LINE DATA",
                    details: lineData
                });
                salesOrder.selectLine({
                    sublistId: "item",
                    line: lineData.soLine
                });
                let currentProj = salesOrder.getCurrentSublistValue({
                    sublistId: "item",
                    fieldId: "job"
                });
                log.debug({
                    title: "JOB",
                    details: currentProj
                });
                if (!currentProj || currentProj !== lineData.project) {
                    log.debug("SET");
                    salesOrder.setCurrentSublistValue({
                        sublistId: "item",
                        fieldId: "job",
                        value: lineData.project
                    });
                    salesOrder.commitLine({
                        sublistId: "item"
                    });
                }

                record.submitFields({
                    type: "customrecordzab_subscription_item",
                    id: lineData.subItem,
                    values: {
                        custrecord_scg_proj_on_tran: true
                    }
                });
            });
            salesOrder.save();
        } catch (e) {
            log.error({
                title: "REDUCE ERROR",
                details: e
            });
        }
    };

    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summary - Statistics about the execution of a map/reduce script
     * @param {number} summary.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summary.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summary.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summary.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summary.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summary.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summary.yields - Total number of yields when running the map/reduce script
     * @param {Object} summary.inputSummary - Statistics about the input stage
     * @param {Object} summary.mapSummary - Statistics about the map stage
     * @param {Object} summary.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = summary => {
        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.
        let errorSummaryObjects = [];
        summary.mapSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                errorSummaryObjects.push({
                    stage: "Map",
                    key: key,
                    details: error,
                    executionNo: executionNo
                });
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
                errorSummaryObjects.push({
                    stage: "Reduce",
                    key: key,
                    details: error,
                    executionNo: executionNo
                });
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

        log.audit("FINISH");
    };

    return { getInputData, map, reduce, summarize };
});
