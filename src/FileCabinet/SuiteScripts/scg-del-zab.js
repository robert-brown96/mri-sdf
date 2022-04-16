/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/record", "N/query", "N/search", "N/runtime"], (
    record,
    query,
    search,
    runtime
) => {
    const tranTypes = {
        CustInvc: record.Type.INVOICE,
        SalesOrd: record.Type.SALES_ORDER,
        CustCred: record.Type.CREDIT_MEMO
    };
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
            log.audit("START DELETE");

            const scrip = runtime.getCurrentScript();
            const sea = scrip.getParameter({
                name: "custscript_search_to_del"
            });
            if (sea) return sea;
        } catch (e) {
            log.error({
                title: "getInputData: ERROR",
                details: e
            });
        }
    };

    /**
     * Defines the function that is executed when the map entry point is triggered. This entry point is triggered automatically
     * when the associated getInputData stage is complete. This function is applied to each key-value pair in the provided
     * context.
     * @param {Object} context - Data collection containing the key-value pairs to process in the map stage. This parameter
     *     is provided automatically based on the results of the getInputData stage.
     * @param {Iterator} context.errors - Serialized errors that were thrown during previous attempts to execute the map
     *     function on the current key-value pair
     * @param {number} context.executionNo - Number of times the map function has been executed on the current key-value
     *     pair
     * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} context.key - Key to be processed during the map stage
     * @param {string} context.value - Value to be processed during the map stage
     * @since 2015.2
     */

    const map = context => {
        try {
            log.debug({
                title: `map for ${context.key}`,
                details: context.value
            });
            const searchResult = JSON.parse(context.value);
            const mapData = searchResult.values;
            record.submitFields({
                type: "customrecordzab_subscription_item",
                id: searchResult.id,
                values: {
                    custrecordzab_si_rate_type: 3,
                    custrecordzab_si_quantity: 1,
                    custrecordzab_si_rate: 1
                }
            });

            const chargeQl = `SELECT c.id as chargeId,c.custrecordzab_c_transaction as transaction,t.type as tranType
                                FROM customrecordzab_charge c
                                LEFT OUTER JOIN transaction t ON c.custrecordzab_c_transaction = t.id
                                WHERE custrecordzab_c_subscription_item = ${searchResult.id}`;

            const chargeRes = query.runSuiteQL(chargeQl).asMappedResults();

            const trans = chargeRes.filter(c => c.transaction);

            trans.forEach(c => {
                try {
                    record.delete({
                        type: tranTypes[c.tranType],
                        id: c.transaction
                    });
                } catch (e) {
                    log.error({
                        title: `Transaction ${c.transaction} could not be deleted`,
                        details: e
                    });
                }
            });

            context.write({
                key: searchResult.id,
                values: chargeRes
            });
        } catch (e) {
            log.error({
                title: "map: ERROR",
                details: e
            });
        }
    };

    /**
     * Defines the function that is executed when the reduce entry point is triggered. This entry point is triggered
     * automatically when the associated map stage is complete. This function is applied to each group in the provided context.
     * @param {Object} context - Data collection containing the groups to process in the reduce stage. This parameter is
     *     provided automatically based on the results of the map stage.
     * @param {Iterator} context.errors - Serialized errors that were thrown during previous attempts to execute the
     *     reduce function on the current group
     * @param {number} context.executionNo - Number of times the reduce function has been executed on the current group
     * @param {boolean} context.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {string} context.key - Key to be processed during the reduce stage
     * @param {List<String>} context.values - All values associated with a unique key that was passed to the reduce stage
     *     for processing
     * @since 2015.2
     */
    const reduce = context => {
        try {
            log.debug({
                title: `reduce for ${context.key}`,
                details: context.values
            });

            const parsedVals = context.values.map(v => JSON.parse(v));

            parsedVals.forEach(c => {
                try {
                    record.delete({
                        type: "customrecordzab_charge",
                        id: c.chargeId
                    });
                } catch (e) {
                    log.error({
                        title: `charge ${c.chargeId} could not be deleted`,
                        details: e
                    });
                }
            });
        } catch (e) {
            log.error({
                title: "reduce: ERROR",
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
        log.audit("FINISH DELETE");
    };

    return { getInputData, map, reduce, summarize };
});
