/**
 * This script contains calls to update rev arrangements on invoice, cash sale, and credit memo
 *
 * @NApiVersion 2.0
 * @NScriptType usereventscript
 * @author Nick Weeks
 */
define(['SuiteScripts/Lib/SCG_rev_rec_lib', 'N/record'], function (revRecLib, record) {

    function beforeSubmit(context) {
        //only execute on edit
        if(context.type == context.UserEventType.EDIT){
            var newObj = context.newRecord;
            var oldObj = context.oldRecord;
            revRecLib.updateRevArrangement(newObj,oldObj);
        }}
      	

    // function beforeLoad(context) {
    //
    // }
    //
    // function afterSubmit(context) {
    //
    // }

    return {
        beforeSubmit: beforeSubmit
        // beforeLoad: beforeLoad,
        // afterSubmit: afterSubmit
    };
});
  
  
/**
 * Logs an exception to the script execution log
 * 
 * @appliedtorecord customer
 * 
 * @param {String} e Exception
 * @returns {Void}
 */
function mri_inv_logError(e) {
	// Log the error based on available details
	if (e instanceof nlobjError) {
		log.error('System Error', e.getCode() + '\n' + e.getDetails());
		//alert(e.getCode() + '\n' + e.getDetails());
	} else {
		log.error('Unexpected Error', e.toString());
		//alert(e.toString());
	}
}
