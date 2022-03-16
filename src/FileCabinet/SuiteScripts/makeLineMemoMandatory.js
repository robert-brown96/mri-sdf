/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       5 October 2020   Robert Brown     Makes line level memos required for journal entries
 *
 */

/**
 * Constants
 */

/**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord salesorder invoice creditmemo
 *
 * @param {String} e Exception
 * @returns {Void}
 */
function scg_mri_logError (e) {
    // Log the error based on available details
    if (e instanceof nlobjError) {
        nlapiLogExecution('ERROR', 'System Error',
            e.getCode() + '\n' + e.getDetails());
        alert(e.getCode() + '\n' + e.getDetails());
    } else {
        nlapiLogExecution('ERROR', 'Unexpected Error', e.toString());
        alert(e.toString());
    }
}

function beforeLoad(type, form, request){
    try{
        scg_mri_lineMemo(type, form, request);
    }catch (e){
        scg_mri_logError(e);
        throw e;
    }

}

function scg_mri_lineMemo(type, form, request){
    //set memo as mandatory
    //suiteanswer 69119
    //
    

    var sublistobj = nlapiGetSubList('line');
    
    var memofield = sublistobj.getField('memo');
    var bunit = sublistobj.getField('cseg_scg_b_unit');
    memofield.setMandatory(true);
 // nlapiDisableLineItemField('line','cseg_scg_b_unit',true);
  //	bunit.setMandatory(true);
    
}
