/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 *
 * @author Bobby Brown
 * @Description Runs periodically to find GL posting lines with an activity code
 * An offsetting journal is made grouped by Subsidiary, Currency, and Exchange Rate
 *
 * Parameters from scripts:
 * custscript_scg_period_over - Period being Run
 * custscript_scg_post_date - Posting date for transaction
 * custscript_scg_prior_entries - Entries made prior
 */
define([
    "N/query",
    "N/record",
    "N/search",
    "N/runtime",
    "N/task",
    "N/redirect",
    "./Lib/lodash.min"
], (query, record, search, runtime, task, redirect, _) => {
    const EBITDA_ACCOUNT = 867; //prod value
    const EBITDA_BOOK = 2;
    /**
     * @typedef {Object} header
     * @property {Number} subs - subsidiary
     * @property {Number} fxrate - exchange rate
     * @property {String} currency
     * @property {String} subBase - base currency of subsidiary
     * @property {Number} period
     * @property {String} periodName
     *
     */
    /**
     * @typedef {Object} line
     * @property {Number} lineFx - line exchange rate
     * @property {Number} debit - debit
     * @property {Number} credit
     * @property {Number} account
     * @property {Number} location - location
     * @property {Number} department - department
     * @property {Number} cseg_scg_act_code - activity code
     * @property {Number} cseg_scg_b_unit - business unit
     * @property {String} recType
     * @property {Number} lineId
     * @property {Number} recId
     *
     */
    /**
     * @typedef {Object} params
     * @property {Number[]} prior_entries
     * @property {Number[]} subsidiaries
     * @property {Date} post_date
     * @property {Number} period
     */
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
            if (inputContext.isRestarted) {
                log.audit({
                    title: "Input being restarted",
                    details: inputContext
                });
            }

            const scrip = runtime.getCurrentScript();
            /**
             *
             * @type {params}
             */
            const paramObj = JSON.parse(
                scrip.getParameter({
                    name: "custscript_scg_param_obj"
                })
            );
            const mandatoryKeys = [
                "prior_entries",
                "period",
                "subsidiaries",
                "post_date"
            ];
            if (!paramObj) {
                log.audit({
                    title: "Invalid Parameters",
                    details: paramObj
                });
                return;
            }
            let check = true;
            for (let i = 0; i < mandatoryKeys.length; i++) {
                if (!paramObj.hasOwnProperty(mandatoryKeys[i])) {
                    check = false;
                    break;
                }
            }
            if (!check) {
                log.audit({
                    title: "Invalid Parameters",
                    details: paramObj
                });
                return;
            }
            log.debug({
                title: "PARAM",
                details: paramObj
            });
            //get array of prior transactions passed in
            const toDeleteParam = JSON.parse(paramObj.prior_entries);

            //delete them
            if (toDeleteParam) {
                if (toDeleteParam.length < 401) {
                    _.forEach(toDeleteParam, d => {
                        //20 units
                        record.delete({
                            type: record.Type.JOURNAL_ENTRY,
                            id: d
                        });
                    });
                } else {
                    //only run if over 400 to avoid running out of usage
                    const chunked = _.chunk(toDeleteParam, 400);
                    _.forEach(chunked[0], d => {
                        record.delete({
                            //20 units
                            type: "customtransactionscg_ebitda",
                            id: d
                        });
                    });

                    let t = task.create({
                        taskType: task.Type.MAP_REDUCE,
                        scriptId: "customscript_scg_ebitda_entries",
                        params: {
                            custscript_scg_prior_entries: JSON.stringify(
                                chunked.slice(1)
                            ),
                            custscript_scg_post_date: scrip.getParameter({
                                name: "custscript_scg_post_date"
                            }),
                            custscript_scg_period_over: scrip.getParameter({
                                name: "custscript_scg_period_over"
                            })
                        }
                    });
                    t.submit(); //20 units

                    redirect.toTaskLink({
                        id: "LIST_MAPREDUCESCRIPTSTATUS",
                        parameters: {
                            scripttype: getScriptInternalId([
                                "customscript_scg_ebitda_entries"
                            ])
                        }
                    });
                    return null;
                }
            }
            let sear = search.load({
                //5 units
                id: 1347
            });
            const perParam = paramObj.period;
            sear.filters.push(
                search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.ANYOF,
                    values: perParam
                })
            );
            const subsidiaries = JSON.parse(paramObj.subsidiaries);
            log.debug("SUBSIDIARIES", subsidiaries);
            sear.filters.push(
                search.createFilter({
                    name: "subsidiary",
                    operator: search.Operator.ANYOF,
                    values: subsidiaries
                })
            );

            return sear;
        } catch (e) {
            log.error({
                title: "ERROR IN GET INPUT",
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
            const searchResult = JSON.parse(context.value);
            const mapData = searchResult.values;
            log.debug({
                title: "map data",
                details: mapData
            });
            const recType = searchResult.recordType;
            const lineId = mapData.line;
            /**
             *
             * @type {header}
             */
            let header = {};
            /**
             *
             * @type {line}
             */
            let line = {};
            line.department = mapData.department.value;
            line.account = mapData.account.value;
            line.location = mapData.location.value;
            if (mapData.debitfxamount) {
                line.debit = Number(mapData.debitfxamount);
            } else {
                line.credit = Number(mapData.creditfxamount);
            }
            line.cseg_scg_act_code = mapData["line.cseg_scg_act_code"].value;
            line.cseg_scg_b_unit = mapData["line.cseg_scg_b_unit"].value;
            line.recId = Number(context.key);
            line.recType = recType;
            line.lineId = lineId;
            header.subs = mapData.subsidiary.value;
            header.currency = mapData.currency.value;
            // if line fx rate is truthy, use that
            header.fxrate = mapData.linefxrate
                ? mapData.linefxrate
                : mapData.exchangerate;
            header.subBase = mapData["currency.subsidiary"].value;
            header.period = mapData.postingperiod.value;
            header.periodName = mapData.postingperiod.text;

            context.write({
                key: JSON.stringify(header),
                value: JSON.stringify(line)
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
                title: "Reduce",
                details: context
            });
            const scrip = runtime.getCurrentScript();
            /**
             *
             * @type {params}
             */
            const paramObj = JSON.parse(
                scrip.getParameter({
                    name: "custscript_scg_param_obj"
                })
            );
            const postDate = paramObj.post_date;
            const periodParam = paramObj.period;
            log.debug({
                title: "REDUCE PARAMETERS",
                details: `POSTING ON: ${postDate} && PERIOD IS:${periodParam}`
            });
            /**
             *
             * @type {header}
             */
            let header = JSON.parse(context.key);

            let newRec = record.create({
                // 10 units
                type: record.Type.JOURNAL_ENTRY,
                isDynamic: true
            });
            newRec.setValue({
                fieldId: "subsidiary",
                value: header.subs
            });
            //make it a book specific entry
            newRec.setValue({
                fieldId: "bookje",
                value: true
            });
            newRec.setValue({
                fieldId: "accountingbook",
                value: EBITDA_BOOK
            });
            newRec.setValue({
                fieldId: "custbody_scg_adjustment_je",
                value: true
            });

            newRec.setValue({
                fieldId: "currency",
                value: header.currency
            });

            newRec.setValue({
                fieldId: "trandate",
                value: new Date(postDate)
            });
            newRec.setValue({
                fieldId: "exchangerate",
                value: header.fxrate
            });
            newRec.setValue({
                fieldId: "postingperiod",
                value: periodParam
            });
            let parsedObjs = [];
            _.forEach(context.values, v => {
                parsedObjs.push(JSON.parse(v));
            });
            const offsetLines = [
                ...parsedObjs
                    .reduce((r, o) => {
                        const key =
                            o.location +
                            "&" +
                            o.department +
                            "&" +
                            o.cseg_scg_act_code +
                            "&" +
                            o.cseg_scg_b_unit;
                        const item =
                            r.get(key) ||
                            Object.assign({}, o, {
                                debit: 0,
                                credit: 0
                            });
                        item.debit += typeof o.debit === "number" ? o.debit : 0;
                        item.credit +=
                            typeof o.credit === "number" ? o.credit : 0;
                        return r.set(key, item);
                    }, new Map())
                    .values()
            ];
            _.forEach(context.values, l => {
                /**
                 * @type {line}
                 */
                let line = JSON.parse(l);
                newRec.selectNewLine({
                    sublistId: "line"
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "memo",
                    value: `Allocation Source in ${header.periodName}`
                });
                for (const [k, v] of Object.entries(line)) {
                    if (k !== "recType" && k !== "lineId" && k !== "recId") {
                        if (k === "debit" || k === "credit") {
                            if (k === "debit") {
                                newRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "credit",
                                    value: v
                                });
                            } else {
                                newRec.setCurrentSublistValue({
                                    sublistId: "line",
                                    fieldId: "debit",
                                    value: v
                                });
                            }
                        } else {
                            newRec.setCurrentSublistValue({
                                sublistId: "line",
                                fieldId: k,
                                value: v
                            });
                        }
                    }
                }
                newRec.commitLine({
                    sublistId: "line"
                });
            });

            _.forEach(offsetLines, l => {
                newRec.selectNewLine({
                    sublistId: "line"
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "memo",
                    value: `Allocation Destination in ${header.periodName}`
                });
                let amount = l.debit - l.credit;
                if (amount >= 0) {
                    newRec.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "debit",
                        value: amount
                    });
                } else {
                    newRec.setCurrentSublistValue({
                        sublistId: "line",
                        fieldId: "credit",
                        value: amount * -1
                    });
                }
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "department",
                    value: l.department
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "location",
                    value: l.location
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "cseg_scg_act_code",
                    value: l.cseg_scg_act_code
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "cseg_scg_b_unit",
                    value: l.cseg_scg_b_unit
                });
                newRec.setCurrentSublistValue({
                    sublistId: "line",
                    fieldId: "account",
                    value: EBITDA_ACCOUNT
                });
                newRec.commitLine({
                    sublistId: "line"
                });
            });
            const newJe = newRec.save(); //20 units
            log.debug({
                title: "MADE RECORD",
                details: newJe
            });
            if (newJe) {
                const groupedById = _.groupBy(parsedObjs, "recId");
                for (const [k, v] of Object.entries(groupedById)) {
                    const recId = k;
                    const recType = v[0].recType;
                    let updateRec = record.load({
                        //10 units
                        type: recType,
                        id: recId,
                        isDynamic: false
                    });
                    _.forEach(
                        v,
                        /**@type {line}*/ obj => {
                            if (
                                recType === record.Type.JOURNAL_ENTRY ||
                                recType ===
                                    record.Type.ADV_INTER_COMPANY_JOURNAL_ENTRY
                            ) {
                                updateRec.setSublistValue({
                                    sublistId: "line",
                                    fieldId: "custcol_scg_linked_ebitda",
                                    value: newJe,
                                    line: obj.lineId
                                });
                            } else {
                                let subLineId = obj.lineId - 1;
                                if (
                                    recType === record.Type.VENDOR_BILL ||
                                    recType === record.Type.EXPENSE_REPORT
                                ) {
                                    updateRec.setSublistValue({
                                        sublistId: "expense",
                                        fieldId: "custcol_scg_linked_ebitda",
                                        value: newJe,
                                        line: subLineId
                                    });
                                }
                            }
                        }
                    );
                    try {
                        updateRec.save(); //20 units
                    } catch (e) {
                        let updateRec = record.load({
                            //10 units
                            type: recType,
                            id: recId,
                            isDynamic: false
                        });
                        _.forEach(
                            v,
                            /**@type {line}*/ obj => {
                                if (
                                    recType === record.Type.JOURNAL_ENTRY ||
                                    recType ===
                                        record.Type
                                            .ADV_INTER_COMPANY_JOURNAL_ENTRY
                                ) {
                                    updateRec.setSublistValue({
                                        sublistId: "line",
                                        fieldId: "custcol_scg_linked_ebitda",
                                        value: newJe,
                                        line: obj.lineId
                                    });
                                } else {
                                    let subLineId = obj.lineId - 1;
                                    if (
                                        recType === record.Type.VENDOR_BILL ||
                                        recType === record.Type.EXPENSE_REPORT
                                    ) {
                                        updateRec.setSublistValue({
                                            sublistId: "expense",
                                            fieldId:
                                                "custcol_scg_linked_ebitda",
                                            value: newJe,
                                            line: subLineId
                                        });
                                    }
                                }
                            }
                        );
                        updateRec.save(); //20 units
                    }
                }
            }
        } catch (e) {
            log.error({
                title: "REDUCE ERROR",
                details: e
            });
        }
    };

    /**
     * Returns the internal id of the given script
     *
     * @appliedtorecord script
     *
     * @param {Array} scriptId: identifier given to this script
     * @returns {Number|null}
     */
    const getScriptInternalId = scriptId => {
        let scriptInternalId = "";

        const scriptSearch = search.create({
            type: "script",
            columns: ["internalid"],
            filters: [["scriptid", search.Operator.IS, scriptId]]
        });
        const resultSet = scriptSearch.run().getRange(0, 1000);

        if (resultSet && resultSet.length > 0)
            scriptInternalId = resultSet[0].id;

        return scriptInternalId ? scriptInternalId : null;
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
        if (summary.isRestarted) {
            log.audit("Summary Stage is being Restarted");
        }

        // If an error was thrown during the input stage, log the error.

        if (summary.inputSummary.error) {
            log.error({
                title: "Input Error",
                details: summary.inputSummary.error
            });
        }

        // For each error thrown during the map stage, log the error, the corresponding key,
        // and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.mapSummary.errors
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
                return true;
            });

        // For each error thrown during the reduce stage, log the error, the corresponding
        // key, and the execution number. The execution number indicates whether the error was
        // thrown during the the first attempt to process the key, or during a
        // subsequent attempt.

        summary.reduceSummary.errors
            .iterator()
            .each(function (key, error, executionNo) {
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
    };

    const getCurrentPeriod = () => {
        try {
            const scr = runtime.getCurrentScript();
            let perParam = scr.getParameter({
                name: "custscript_scg_period_over"
            });
            if (perParam) {
                let quer = query.create({
                    type: query.Type.ACCOUNTING_PERIOD
                });
                let overCond = quer.createCondition({
                    fieldId: "id",
                    operator: query.Operator.ANY_OF,
                    values: perParam
                });
                quer.columns = [
                    quer.createColumn({
                        fieldId: "id"
                    }),
                    quer.createColumn({
                        fieldId: "periodname",
                        alias: "name"
                    }),
                    quer.createColumn({
                        fieldId: "startdate"
                    }),
                    quer.createColumn({
                        fieldId: "enddate"
                    })
                ];
                quer.condition = quer.and(overCond);
                quer.sort = [
                    quer.createSort({
                        column: quer.columns[2],
                        ascending: true
                    })
                ];

                let run = quer.run().asMappedResults();

                return run[0];
            }
            let quer = query.create({
                type: query.Type.ACCOUNTING_PERIOD
            });
            let isClosedCondition = quer.createCondition({
                fieldId: "closed",
                operator: query.Operator.IS,
                values: false
            });
            let adjustFilter = quer.createCondition({
                fieldId: "isadjust",
                operator: query.Operator.IS,
                values: false
            });
            let isYear = quer.createCondition({
                fieldId: "isyear",
                operator: query.Operator.IS,
                values: false
            });
            let isQuarter = quer.createCondition({
                fieldId: "isquarter",
                operator: query.Operator.IS,
                values: false
            });
            quer.condition = quer.and(
                isClosedCondition,
                adjustFilter,
                isYear,
                isQuarter
            );
            quer.columns = [
                quer.createColumn({
                    fieldId: "id"
                }),
                quer.createColumn({
                    fieldId: "periodname",
                    alias: "name"
                }),
                quer.createColumn({
                    fieldId: "startdate"
                }),
                quer.createColumn({
                    fieldId: "enddate"
                })
            ];
            quer.sort = [
                quer.createSort({
                    column: quer.columns[2],
                    ascending: true
                })
            ];

            let run = quer.run().asMappedResults();

            return run[0];
        } catch (e) {
            log.error({
                title: "ERROR GETTING PERIOD",
                details: e
            });
        }
    };

    return { getInputData, map, reduce, summarize };
});
