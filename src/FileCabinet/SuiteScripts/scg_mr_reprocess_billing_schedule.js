/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 * @author Bobby Brown
 *
 *
 */


define(['N/search',
        'N/record',
        'N/runtime',
        'N/error',
        'N/format',
        './Lib/_scg_zab_lib.js',
        'SuiteScripts/Lib/lodash.min',
    'SuiteScripts/Lib/moment.min'
    ],
    function(search, record, runtime,error,format,CONSTANTS,_,moment){

        /**
         * Marks the beginning of the Map/Reduce process and generates input data.
         *
         * @function getInputData
         * @return {Array|Object|Search|ObjectRef} inputSummary
         */
        function getInputData(){

            try {
                log.debug({
                    title:'START',
                    details: 'Get Input Data'
                });

                var script = runtime.getCurrentScript();
                var searchParam = script.getParameter({
                    name:'custscript_cd_search'
                });


                //get count data for processing
                var mySearch = search.load({
                    id: searchParam
                });


                //send results to map stage
                return mySearch;
            }//end try
            catch (e) {
                log.error({
                    title: 'Get Input Error',
                    details: e
                });
            }finally {
                log.debug('End Get Input');
            }

        }//end get input

        /**
         * Executes when the map entry point is triggered and applies to each key/value pair.
         * Write Subscriptions as Keys and Count Records as Values
         *
         *
         * @function map
         * @param context {mapReduceContext}- Data collection containing the key/value pairs to process through the map stage
         * @param context.value {searchResult}
         * @return {void}
         */
        function map(context){
            try{
                log.debug('---- Start map ----');
                log.debug({
                    title:'context',
                    details: context
                });

                var searchResult = JSON.parse(context.value);
                var mapData = searchResult.values;
                log.debug({
                    title:'contextparse',
                    details: mapData
                });

                var countRec = searchResult.id;
                let existingBillingCountSearch = search.create({
                    type:CONSTANTS.RECORD_TYPE.SCG_COUNT.ID,
                    filters:[
                        [CONSTANTS.RECORD_TYPE.SCG_COUNT.Field.COUNT,search.Operator.IS,countRec]
                    ],
                    columns:[
                        'internalid'
                    ]
                });
                existingBillingCountSearch.run().each(a => {
                    log.debug({
                        title:'Deleting exiting',
                        details:a.id
                    });
                    record.delete({
                        type:CONSTANTS.RECORD_TYPE.SCG_COUNT.ID,
                        id:a.id
                    })
                    return true;
                });


                var chargeSchedule = mapData['custrecordzab_s_charge_schedule.CUSTRECORDZAB_CD_SUBSCRIPTION'];
                log.debug({
                    title:'Charge Schedule',
                    details:chargeSchedule.value
                });
               // var chargeScheduleId = chargeSchedule["custrecordzab_cd_subscription.custrecordzab_s_charge_schedule"][0].value;
                var billFrequency = search.lookupFields({
                    type:'customrecordzab_charge_schedules',
                    id:chargeSchedule.value,
                    columns:[
                        'custrecord_scg_bill_frequency'
                    ]
                });
                log.debug(billFrequency);
                var param = billFrequency['custrecord_scg_bill_frequency'];
                log.debug({
                    title:'Billing Frequency',
                    details:param
                });

                if (param===2){
                    CONSTANTS.biannualChargesMoment([countRec]);
                }else if(param===4){
                    log.debug('--RUn Quarterly--');
                    CONSTANTS.quarterlyChargesMoment([countRec]);
                }










            }catch (e) {
                log.error({
                    title: 'Error in map',
                    details: e
                });
            }finally {
                log.debug('----End Map----');
            }
        }//end map
        /**
         * Executes when the reduce entry point is triggered and applies to each group.
         *
         * @function reduce
         * @param context {ReduceContext} Data collection containing the groups to process through the reduce stage
         * @param context.key - {object} Object of header values for the count record
         * @param context.values {record[]} Count records to be reduced
         * @return {void}
         */
        function reduce(context){
            try{
                log.debug('---- Start Reduce ----');
                log.debug({
                    title:'Reduce Context',
                    details: context
                });





            }catch (e) {
                log.error({
                    title: 'Error in reduce for key ' + context.key,
                    details: e
                });
            }finally {
                log.debug({
                    title:'End reduce',
                    details:'Processed ' + context.values.length + ' CD Records'
                });
            }
        }   //end reduce
        /**
         * @function summarize
         * @param summary
         * @param summary.inputSummary
         * @param summary.mapSummary
         * @param summary.reduceSummary
         * @param summary.output
         * @param summary.isRestarted {boolean}
         *
         */
        function summarize(summary){

            if (summary.isRestarted){
                log.audit('Summary Stage is being Restarted');
            }



            // Copied from SuiteAnswer 70275
            // If an error was thrown during the input stage, log the error.

            if (summary.inputSummary.error)
            {
                log.error({
                    title: 'Input Error',
                    details: summary.inputSummary.error
                });
            }


            // For each error thrown during the map stage, log the error, the corresponding key,
            // and the execution number. The execution number indicates whether the error was
            // thrown during the the first attempt to process the key, or during a
            // subsequent attempt.

            summary.mapSummary.errors.iterator().each(function (key, error, executionNo){
                log.error({
                    title: 'Map error for key: ' + key + ', execution no.  ' + executionNo,
                    details: error
                });
                return true;
            });


            // For each error thrown during the reduce stage, log the error, the corresponding
            // key, and the execution number. The execution number indicates whether the error was
            // thrown during the the first attempt to process the key, or during a
            // subsequent attempt.

            summary.reduceSummary.errors.iterator().each(function (key, error, executionNo){
                log.error({
                    title: 'Reduce error for key: ' + key + ', execution no. ' + executionNo,
                    details: error
                });
                return true;
            });

        }//end summary

        return{
            getInputData : getInputData,
            map : map,
        //    reduce : reduce,
            summarize : summarize
        };


    });//end