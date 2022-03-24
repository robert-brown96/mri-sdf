/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */
define(["N/record", "N/runtime", "./Lib/lodash.min"], (record, runtime, _) => {
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
            log.audit("START");
            const scrip = runtime.getCurrentScript();
            let dataIn = scrip.getParameter({
                name: "custscript_scg_summarizing"
            });
            dataIn = dataIn ? JSON.parse(dataIn) : null;

            return dataIn;
        } catch (e) {
            log.error({
                title: "Get Input Error",
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
                title: "---- Start map ----",
                details: context
            });
            const subString = JSON.parse(context.value);

            const { subId, recs, last_change, nextAnn } = subString;

            let processJob = record.create({
                //2 gov
                type: "customrecord_scg_renewal_process",
                isDynamic: true
            });

            let uplifts = _.uniq(
                recs.map(x => {
                    let temp = parseFloat(x.uplift);
                    if (typeof temp === "number" && temp > 0) return temp;
                })
            );

            log.debug(uplifts);
            processJob.setValue({
                fieldId: "custrecord_scg_p_last_effective",
                value: new Date(last_change)
            });

            processJob.setValue({
                fieldId: "custrecord_scg_res_json",
                value: JSON.stringify(recs)
            });
            processJob.setValue({
                fieldId: "custrecord_scg_pr_sub",
                value: subId
            });
            if (uplifts[0])
                processJob.setValue({
                    fieldId: "custrecord_scg_uplift_process",
                    value: uplifts[0]
                });

            const pjId = processJob.save(); // 4 gov
            log.debug("JOB", pjId);

            let subResults = record.submitFields({
                //2 gov
                type: "customrecordzab_subscription",
                id: subId,
                values: {
                    custrecord_scg_last_uplift_date: new Date(),
                    custrecord_scg_uplift_log: pjId,
                    custrecord_scg_next_anniversary: new Date(nextAnn)
                }
            });
        } catch (e) {
            log.error({
                title: "ERROR IN MAP",
                details: e
            });
            throw e.message;
        }
    };

    /**
     * Defines the function that is executed when the summarize entry point is triggered. This entry point is triggered
     * automatically when the associated reduce stage is complete. This function is applied to the entire result set.
     * @param {Object} summaryContext - Statistics about the execution of a map/reduce script
     * @param {number} summaryContext.concurrency - Maximum concurrency number when executing parallel tasks for the map/reduce
     *     script
     * @param {Date} summaryContext.dateCreated - The date and time when the map/reduce script began running
     * @param {boolean} summaryContext.isRestarted - Indicates whether the current invocation of this function is the first
     *     invocation (if true, the current invocation is not the first invocation and this function has been restarted)
     * @param {Iterator} summaryContext.output - Serialized keys and values that were saved as output during the reduce stage
     * @param {number} summaryContext.seconds - Total seconds elapsed when running the map/reduce script
     * @param {number} summaryContext.usage - Total number of governance usage units consumed when running the map/reduce
     *     script
     * @param {number} summaryContext.yields - Total number of yields when running the map/reduce script
     * @param {Object} summaryContext.inputSummary - Statistics about the input stage
     * @param {Object} summaryContext.mapSummary - Statistics about the map stage
     * @param {Object} summaryContext.reduceSummary - Statistics about the reduce stage
     * @since 2015.2
     */
    const summarize = summaryContext => {
        let mapErrors = [];
        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summaryContext.mapSummary.errors
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
                mapErrors.push({ asset: key, message: error, stage: "map" });
                return true;
            });
        log.debug({ title: "MAP ERRORS", details: mapErrors });

        log.audit("FINISH");
    };

    return { getInputData, map, summarize };
});
