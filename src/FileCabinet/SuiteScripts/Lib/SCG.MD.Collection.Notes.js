/**
 * 
 * @NModuleScope Public
 * 
 * Utility Functions for Collection Notes
 * 
 * Version     Date             Author            Remarks
 * 1.00        6/13/2019        Nick Weeks        Initial Version
 * 1.05        16 Oct 2020      Doug Humberd      Updated to Uncheck the 'Follow Up Completed' on older Collection Notes records
 * 
 */
//THIS IS A CHANGE
define(['N/record', 'N/search'], function(record, search) {
  return {
    updateInvoice: function(invoiceID, colNoteObj, type) {
    	
      var colNoteId = colNoteObj.id;
      log.debug('Collection Note ID', colNoteId);
      
      var followUpComp = colNoteObj.getValue({
    	    fieldId: 'custrecord_scg_cn_follow_up_done'
      });
      log.debug('Follow Up Completed', followUpComp);
      
      if (type == 'create' || (type == 'edit' && followUpComp == false)){
    	  
    	  log.debug('Update fields on Invoice', 'INVOICE UPDATE');
    	  
    	//Arrays for Invoice Body fields and Custom Collection Note Record fields
          var invFieldIds = ['custbody_scg_cn_reporter','custbody_scg_cn_follow_up_date','custbody_scg_cn_notes','custbody_scg_cn_follow_up_done',
                            'custbody_scg_cn_payment_date','custbody_scg_cn_method_comm','custbody_scg_cn_col_note_status','custbody_scg_cn_date','custbody_collection_probability'];
          var colNoteFieldIds = ['custrecord_scg_cn_reporter','custrecord_scg_cn_follow_up_date','custrecord_scg_cn_notes','custrecord_scg_cn_follow_up_done','custrecord_sc_cn_payment_date',
                                'custrecord_scg_cn_method_comm','custrecord_scg_cn_status','custrecord_scg_cn_date_created','custrecord_collection_probability'];
          // object for fields to be submitted
          var submitFields = new Object;
          //loop through field ids in colNoteFieldIds array and add their value to submitFields Object
          for(var i = 0; i < colNoteFieldIds.length; i++){
            // log.debug('colNoteFieldIds[i]',colNoteFieldIds[i]);
            var curValue = colNoteObj.getValue({
              fieldId: colNoteFieldIds[i]
            });
            // log.debug('curValue',curValue);
            var curInvValue = invFieldIds[i];
            submitFields[curInvValue] = curValue;
          }
          log.debug('submit fields object', submitFields);
          //Submit record to InvoiceId using object built in for loop
          var invoice = record.submitFields({
            type: record.Type.INVOICE,
            id: invoiceID,
            values: submitFields
          });
    	  
      }//End if (type == 'edit' && followUpComp == false)
      
      
    if (type == 'create'){
    	
    	log.debug('Update Follow Up Completed Checkboxes', 'UPDATE FOLLOW UP');
    	
    	//Identity Other Collection Note Records to be Updated
      	var getOtherCollNotesSearch = search.create({
      		type:'customrecord_scg_collection_note',
      		columns: ['internalid'],
      		filters: [
                ['isinactive', 'is', 'F'],
                'AND',
                ['custrecord_scg_cn_transaction', 'anyof', invoiceID],
                'AND', 
                ['internalid', 'noneof', colNoteId],
                'AND',
                ['custrecord_scg_cn_follow_up_done', 'is', 'F']
            ]
      	});
      	
      	var result = getOtherCollNotesSearch.run();
      	
      	if (!result){
      		return;
      	}
      	
      	var resultRange = result.getRange({
            start: 0,
            end: 1000
      	});
      	
      	for (var i = 0; i < resultRange.length; i++){
      		
      		var otherColNoteId = resultRange[i].getValue({
                name: 'internalid'
      		});
      		log.debug('Other Collection Note ID Line ' + i, otherColNoteId);
      		
      		log.debug('Check off Follow Up Completed', 'CHECK');
      		var updatedOtherRec = record.submitFields({
      	        type: 'customrecord_scg_collection_note',
      	        id: otherColNoteId,
      	        values: {
      	        	'custrecord_scg_cn_follow_up_done' : true
      	        }
      	      });
      		
      	}//End for i loop
    	
    }  
      
    
      
      
      return invoice;
     }
  
    // getMappingRecords: function(){
    // var recordsSearch = search.create{(
    // type://TODO: Get custom record type here,
    // )};
    // var mapRecs = [];
    // var records = search.run().each(function(result){
    // 	var recordType = result.getValue({
    // 		name://TODO: Get intnernal ID of record type name
    // 	});
    // 	var tranField = result.getValue({
    // 		name://TODO: Get internal ID of transaction field
    // 	});
    // 	var cnField = result.getValue({
    // 		name://TODO: Get intnernal ID of cn FIeld
    // 	});
    // 	var curRecID = result.id;
    // 	var curRec = {"recordType":recordType,"tranField":tranField,"cnField":cnField,"id":curRecID};
    // 	mapRecs.push(curRec);
    // 	return mapRecs;
    // });
    //},
   // createSubmitFieldsObject:function(mapRecs,cnObject){
    //var submitFields = new Object;
    //for (var i = 0; i < mapRecs.length; i++) {
    //	var curFieldId = mapRecs[i].cnField;
    	//var curValue = cnObject.getValue({
    		//fieldId = curFieldId;
    	//});
    	//var tranFldId = mapRecs[i].tranField;
    	//submitFields[tranFldId] = curValue;
    //}
    //return submitFields;
    //}
  }
})
