/**
 * Library to handle Rev Rec extensions
 *
 * Date             Author
 * 1/25/2019        Nick Weeks
 */

define(["N/record"], function (record) {
    function getRevenueArrangment(recordObj) {
        //get record type
        var type = recordObj.type;
        //if invoice have to use different sublist ID
        if (type == "invoice") {
            var lineNumber = recordObj.findSublistLineWithValue({
                sublistId: "arrngrlrcds",
                fieldId: "type",
                value: "Revenue Arrangement"
            });
            var revArrangementId = recordObj.getSublistValue({
                sublistId: "arrngrlrcds",
                fieldId: "appldatekey",
                line: lineNumber
            });
            log.debug("Invoice", revArrangementId);
        }
        //use usual "links" sublist ID
        else {
            var numLines = recordObj.getLineCount({
                sublistId: "links"
            });
            for (var q = 0; q < numLines; q++) {
                var currLink = recordObj.getSublistValue({
                    sublistId: "links",
                    fieldId: "linkurl",
                    line: q
                });
                if (currLink.indexOf("revarrng") != -1) {
                    var revArrangementId = recordObj.getSublistValue({
                        sublistId: "links",
                        fieldId: "id",
                        line: q
                    });
                }
            }
        }
        if (isNullorEmpty(revArrangementId)) {
            log.debug("Entered", revArrangementId);
            return;
        } else {
            var revArrangeObj = record.load({
                type: record.Type.REVENUE_ARRANGEMENT,
                id: revArrangementId,
                dynamic: true
            });
            return revArrangeObj;
        }
    }

    function getLinesToProcess(newRecordObj, oldRecordObj) {
        var lineCount = newRecordObj.getLineCount({ sublistId: "item" });
        var linesToProcess = [];
        for (var x = 0; x < lineCount; x++) {
            var oldStartDate = oldRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_start_date",
                line: x
            });
            var newStartDate = newRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_start_date",
                line: x
            });
            var oldEndDate = oldRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_end_date",
                line: x
            });
            var newEndDate = newRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_rev_rec_end_date",
                line: x
            });
            var oldOppType = oldRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_scg_opp_type_line",
                line: x
            });
            var newOpptype = newRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_scg_opp_type_line",
                line: x
            });
            var oldStructure = oldRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "cseg_scg_owner_stru",
                line: x
            });
            var newStructure = newRecordObj.getSublistValue({
                sublistId: "item",
                fieldId: "cseg_scg_owner_stru",
                line: x
            });
            if (
                newEndDate != oldEndDate ||
                newStartDate != oldStartDate ||
                oldStructure != newStructure ||
                newOpptype != oldOppType
            ) {
                var uniqueLineId = newRecordObj.getSublistValue({
                    sublistId: "item",
                    fieldId: "lineuniquekey",
                    line: x
                });
                linesToProcess.push({
                    solinenum: x,
                    souniquelineid: uniqueLineId,
                    revrecstart: newStartDate,
                    revrecend: newEndDate,
                    custcol_scg_opp_type_line: newOpptype,
                    cseg_scg_owner_stru: newStructure
                });
            }
        }
        return linesToProcess;
    }

    function proccessLines(revArrangeObj, linesToProcess) {
        for (var i = 0; i < linesToProcess.length; i++) {
            var lineNum = revArrangeObj.findSublistLineWithValue({
                sublistId: "revenueelement",
                fieldId: "sourceid",
                value: linesToProcess[i]["souniquelineid"]
            });
            //set the new startDate
            log.debug("Lines to Processs", linesToProcess[i]);
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "revrecstartdate",
                line: lineNum,
                value: linesToProcess[i].revrecstart
            });
            //set the new endDate
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "revrecenddate",
                line: lineNum,
                value: linesToProcess[i].revrecend
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "forecastenddate",
                line: lineNum,
                value: linesToProcess[i].revrecend
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "custcol_scg_opp_type_line",
                line: lineNum,
                value: linesToProcess[i].custcol_scg_opp_type_line
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "cseg_scg_client_typ",
                line: lineNum,
                value: linesToProcess[i].cseg_scg_client_typ
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "cseg_scg_cus_class",
                line: lineNum,
                value: linesToProcess[i].cseg_scg_cus_class
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "cseg_scg_owner_stru",
                line: lineNum,
                value: linesToProcess[i].cseg_scg_owner_stru
            });
            revArrangeObj.setSublistValue({
                sublistId: "revenueelement",
                fieldId: "forecaststartdate",
                line: lineNum,
                value: linesToProcess[i].revrecstart
            });
        }
        //save the record
        var recId = revArrangeObj.save();
        return recId;
    }

    function updateRevArrangement(newRecObj, oldRecObj) {
        var revArrangeObj = getRevenueArrangment(newRecObj);
        if (isNullorEmpty(revArrangeObj)) {
            return;
        } else {
            var linesToProccess = getLinesToProcess(newRecObj, oldRecObj);
            var processedRecID = proccessLines(revArrangeObj, linesToProccess);
            log.debug("Processed Record", "RecordId = " + processedRecID);
        }
    }
    function isNullorEmpty(checkVal) {
        if (checkVal != null && checkVal != undefined && checkVal != "") {
            return false;
        } else {
            return true;
        }
    }
    return {
        getRevenueArrangment: getRevenueArrangment,
        getLinesToProcess: getLinesToProcess,
        proccessLines: proccessLines,
        updateRevArrangement: updateRevArrangement
    };
});
