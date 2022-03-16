/**
 * Logs an exception to the script execution log
 *
 * @appliedtorecord subscription item
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

function afterSubmit(type){
    try{
        getProjID();
    }catch (e){
        scg_mri_logError(e);
        throw e;
    }

}

function beforeSubmit(type){
    try{
       if (type == 'create' || type == 'edit'){
           setExternalID(type);
       }

    }catch (e){
        scg_mri_logError(e);
        throw e;
    }

}
function setExternalID(type){
    var record_id = nlapiGetRecordId();
    var record_type = nlapiGetRecordType();
    var newID;
    var oldID;
  if(type == 'create'){
    if (record_type == 'account'){
        newID = nlapiGetNewRecord().getFieldValue('acctnumber');
       // oldID = nlapiGetOldRecord().getFieldValue('acctnumber');
    } else if (record_type == 'location'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_loc');
       // oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_loc');
    }else if (record_type == 'department'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_dept');
      //  oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_dept');
    }else if (record_type == 'subsidiary'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_sub');
      //  oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_sub');
    }else if (record_type == 'classification'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_scategory');
      //  oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_scategory');
    }else if (record_type == 'customrecord_cseg_scg_b_unit'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_bu');
      //  oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_bu');
    } else{
        nlapiLogExecution('AUDIT','Invalid Record Type');
        return;
    }
  }else{
    if (record_type == 'account'){
        newID = nlapiGetNewRecord().getFieldValue('acctnumber');
        oldID = nlapiGetOldRecord().getFieldValue('acctnumber');
    } else if (record_type == 'location'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_loc');
        oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_loc');
    }else if (record_type == 'department'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_dept');
        oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_dept');
    }else if (record_type == 'subsidiary'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_sub');
        oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_sub');
    }else if (record_type == 'classification'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_scategory');
        oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_scategory');
    }else if (record_type == 'customrecord_cseg_scg_b_unit'){
        newID = nlapiGetNewRecord().getFieldValue('custrecord_scg_code_bu');
        oldID = nlapiGetOldRecord().getFieldValue('custrecord_scg_code_bu');
    } else{
        nlapiLogExecution('AUDIT','Invalid Record Type');
        return;
    }}


    //Set value if it is a new record
    if (type == 'create'){
        nlapiSetFieldValue('externalid',newID);
    }else {
        if (newID == oldID){
            nlapiLogExecution('AUDIT','No Change');
            return;
        } else{
            nlapiSubmitField(record_type,record_id,'externalid',newID);
        }
    }

}
