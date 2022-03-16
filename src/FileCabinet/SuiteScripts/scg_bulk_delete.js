/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Bobby Brown
 *
 * Provide an ID as a parameter for the script
 * All records will attempt to be deleted
 * Any errors will be logged in the summary stage
 *
 */
define(['N/search', 'N/record', 'N/runtime', 'N/email'], (
    search,
    record,
    runtime,
    email
) => {
    /**
     * Marks the beginning of the Map/Reduce process and generates input data.
     *
     * @function getInputData
     * @return {Array|Object|Search|ObjectRef} inputSummary
     */
    const getInputData = () => {
        try {
            log.debug({
                title: 'START',
                details: 'Get Input Data',
            });
            let res;
            //load parameter search
            let script = runtime.getCurrentScript();
            let p = script.getParameter({
                name: 'custscriptscg_srch_del_id',
            });
            log.debug({
                title: 'START',
                details: p,
            });
            res = search.load({
                id: p,
            });

            //send results to map stage
            return res;
        } catch (e) {
            //end try
            log.error({
                title: 'Get Input Error',
                details: e,
            });
        } finally {
            log.debug('End Get Input');
        }
    }; //end get input

    /**
     * Executes when the map entry point is triggered and applies to each key/value pair.
     * Write Subscriptions as Keys and Count Records as Values
     *
     *
     * @function map
     * @param context {mapReduceContext}- Data collection containing the key/value pairs to process through the map stage
     * @param context.value {searchResult}
     * @param context.key {string}
     * @return {void}
     */
    const map = (context) => {
        try {
            log.debug({
                title: '---- Start map ----',
                details: context,
            });
            //parse search result
            const searchResult = JSON.parse(context.value);
            const mapData = searchResult.values;

            const recId = searchResult.id;
            const recType = searchResult.recordType;

            const res = record.delete({
                type: recType,
                id: recId,
            });

            context.write({
                key: recType,
                value: {
                    id: res,
                },
            });
        } catch (e) {
            log.error({
                title: 'Error in map',
                details: e,
            });
        } finally {
            log.debug('----End Map----');
        }
    }; //end map

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
    const summarize = (summary) => {
        if (summary.isRestarted) {
            log.audit('Summary Stage is being Restarted');
        }

        // If an error was thrown during the input stage, log the error.

        if (summary.inputSummary.error) {
            log.error({
                title: 'Input Error',
                details: summary.inputSummary.error,
            });
        }

        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.
        let mapErrors = [];
        let i = 0;

        summary.mapSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
                mapErrors['key'] = error;
                i += i;
                log.error({
                    title:
                        'Map error for key: ' +
                        key +
                        ', execution no.  ' +
                        executionNo,
                    details: error,
                });
                return true;
            });
    }; //end summary

    return {
        config: {
            retryCount: 0,
            exitOnError: false,
        },

        getInputData: getInputData,
        map: map,
        summarize: summarize,
    };
}); //end