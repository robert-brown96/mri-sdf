/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
    "N/search",
    "N/ui/serverWidget",
    "N/task",
    "N/runtime",
    "N/query",
    "N/redirect",
    "./Lib/lodash.min"
], (search, serverWidget, task, runtime, query, redirect, _) => {
    const SEA_ID = "customsearch_scg_act_code";
    /**
     * Defines the Suitelet script trigger point.
     * @param {Object} context
     * @param {ServerRequest} context.request - Incoming request
     * @param {ServerResponse} context.response - Suitelet response
     * @since 2015.2
     */
    const onRequest = context => {
        try {
            if (context.request.method === "GET") {
                _get(context);
            } else {
                _post(context);
            }
        } catch (e) {
            log.error({
                title: "ERROR IN SUITELET",
                details: e
            });
        }
    };

    /**
     * Handles the GET action
     * @param {Object} context
     * @param {ServerRequest} context.request - Incoming request
     * @param {ServerResponse} context.response - Suitelet response
     * @private
     */
    const _get = context => {
        try {
            //create form
            let form = serverWidget.createForm({
                title: "Run EBITDA Entries"
            });
            //get all open periods
            const openPeriods = getOpenPeriods();
            form.clientScriptFileId = 4447; //prod value
            //create a date field for the posting date
            //set it to the end date of the earliest open period and make it mandatory
            let dateFld = form.addField({
                id: "custpage_scg_post_date",
                type: serverWidget.FieldType.DATE,
                label: "Date to Post On"
            });
            dateFld.defaultValue = openPeriods[0].enddate;
            dateFld.isMandatory = true;

            //create a field for the period to run
            let periodFld = form.addField({
                id: "custpage_scg_period",
                type: serverWidget.FieldType.SELECT,
                label: "Period"
            });

            //create a subscription filter
            let subFld = form.addField({
                id: "custpage_scg_subsidiary",
                type: serverWidget.FieldType.SELECT,
                label: "Subsidiary",
                source: "subsidiary"
            });
            subFld.defaultValue = 1;

            //create a field to mark when all child subsidiaries should be included
            let runAllFld = form.addField({
                id: "custpage_scg_includechildren",
                type: serverWidget.FieldType.CHECKBOX,
                label: "Include Children"
            });
            //set this to true by default
            runAllFld.defaultValue = "T";

            //Add all open periods as select options for th period field
            _.forEach(openPeriods, p => {
                periodFld.addSelectOption({
                    value: p.id,
                    text: p.name
                });
            });
            periodFld.defaultValue = openPeriods[0].id;

            //create inline fields
            let unprocessedCount = form // field for how many transaction lines have not been processed
                .addField({
                    id: "custpage_scg_unprocessed",
                    type: serverWidget.FieldType.INTEGER,
                    label: "Unprocessed Lines"
                })
                .updateBreakType({
                    breakType: serverWidget.FieldBreakType.STARTCOL
                });
            unprocessedCount.defaultValue = 0;
            unprocessedCount.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            //shows unprocessed entries in prior period
            let priorPeriodLines = form.addField({
                id: "custpage_scg_prior",
                type: serverWidget.FieldType.INTEGER,
                label: "Unprocessed Lines in Prior Periods"
            });
            priorPeriodLines.defaultValue = 0;
            priorPeriodLines.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });

            //shows existing entries number for period
            let existingEntries = form.addField({
                id: "custpage_scg_existing_entries",
                type: serverWidget.FieldType.INTEGER,
                label: "Existing Entries for Period"
            });
            existingEntries.defaultValue = 0;
            existingEntries.updateDisplayType({
                displayType: serverWidget.FieldDisplayType.INLINE
            });
            //load search for activity code entries
            let sea = search.load({
                id: SEA_ID
            });
            const totalLines = sea.run().getRange(0, 1000); // run without period filter
            sea.filters.push(
                // add filter for posting period
                search.createFilter({
                    name: "postingperiod",
                    operator: search.Operator.ANYOF,
                    values: openPeriods[0].id
                })
            );
            const toBeProcessedResults = sea.run().getRange(0, 1000);
            unprocessedCount.defaultValue = toBeProcessedResults.length;
            priorPeriodLines.defaultValue =
                totalLines.length - toBeProcessedResults.length;
            log.debug({
                title: "PRAM",
                details: context.request.parameters
            });

            form.addSubmitButton("Run EBITDA Entries");
            context.response.writePage(form);
        } catch (e) {
            log.error({
                title: "ERROR IN GET",
                details: e
            });
        }
    };

    const _post = context => {
        try {
            log.debug({
                title: "POSTING",
                details: context
            });
            let childSubs; // initializer
            const periodToRun = context.request.parameters.custpage_scg_period; //get period param
            const postingDate =
                context.request.parameters.custpage_scg_post_date; // get posting date param
            let subParam = Number(
                context.request.parameters.custpage_scg_subsidiary
            ); // convert sub param to number
            let includeChildren =
                context.request.parameters.custpage_scg_includechildren; // check bool value of include children
            if (includeChildren) {
                // run to get children if truthy
                childSubs = getChildSubs(subParam).map(x => x.id);
                log.debug({
                    title: "CHILDREN",
                    details: childSubs
                });
            }
            let ebitQuer = query.create({
                type: query.Type.TRANSACTION
            }); // query for transactions to delete
            let perCond = ebitQuer.createCondition({
                fieldId: "postingperiod",
                operator: query.Operator.ANY_OF,
                values: periodToRun
            });
            let typeCond = ebitQuer.createCondition({
                fieldId: "custbody_scg_adjustment_je",
                operator: query.Operator.IS,
                values: true
            });
            let lineJoin = ebitQuer.autoJoin({
                fieldId: "transactionLines"
            });
            let subJoin = lineJoin.autoJoin({
                fieldId: "subsidiary"
            });
            let subCond = subJoin.createCondition({
                fieldId: "id",
                operator: query.Operator.ANY_OF,
                values: subParam
            });
            if (includeChildren) {
                let parentCond = subJoin.createCondition({
                    fieldId: "id",
                    operator: query.Operator.ANY_OF,
                    values: childSubs
                });
                ebitQuer.condition = ebitQuer.and(
                    perCond,
                    typeCond,
                    ebitQuer.or(subCond, parentCond)
                );
            } else {
                ebitQuer.condition = ebitQuer.and(perCond, typeCond, subCond);
            }

            ebitQuer.columns = [
                ebitQuer.createColumn({
                    fieldId: "id",
                    groupBy: true
                })
            ];
            const ebitResultSet = ebitQuer.run().asMappedResults();
            log.debug({
                title: "RES",
                details: ebitResultSet
            });
            const toDelEntries = ebitResultSet.map(x => x.id); // create arrays of ints to send to map reduce
            let paramObj = {
                // assemble parameters
                post_date: postingDate,
                period: periodToRun,
                prior_entries: JSON.stringify(toDelEntries),
                subsidiaries: includeChildren
                    ? JSON.stringify([subParam, ...childSubs])
                    : JSON.stringify([subParam])
            };
            //send to EBITDA MR
            let mrTask = task.create({
                taskType: task.TaskType.MAP_REDUCE,
                scriptId: "customscript_scg_ebitda_entries",
                params: {
                    custscript_scg_param_obj: JSON.stringify(paramObj)
                }
            });
            mrTask.submit();

            //redirect to task link
            redirect.toTaskLink({
                id: "LIST_MAPREDUCESCRIPTSTATUS",
                parameters: {
                    scripttype: getScriptInternalId([
                        "customscript_scg_ebitda_entries"
                    ])
                }
            });
        } catch (e) {
            log.error({
                title: "ERROR IN POST",
                details: e
            });
        }
    };

    const getCounts = opts => {
        let retVal = {};
        let sea = search.load({
            id: SEA_ID
        });
        const totalLines = sea.run().getRange(0, 1000);
        sea.filters.push(
            search.createFilter({
                name: "postingperiod",
                operator: search.Operator.ANYOF,
                values: opts.period
            })
        );
        const toBeProcessedResults = sea.run().getRange(0, 1000);
        retVal.toBeProcessed = toBeProcessedResults.length;
        retVal.totalLines = totalLines.length;
    };

    const getOpenPeriods = () => {
        try {
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

            return quer.run().asMappedResults();
        } catch (e) {
            log.error({
                title: "ERROR GETTING PERIODS",
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
     *
     * @param sub {Number}
     * @returns {Object[]}
     */
    const getChildSubs = sub => {
        try {
            let quer = query.create({
                type: query.Type.SUBSIDIARY
            });
            let parentCond;
            if (sub != 1) {
                console.log(`NOT Qs`);
                parentCond = quer.createCondition({
                    fieldId: "parent",
                    operator: query.Operator.EQUAL,
                    values: sub
                });
            } else {
                parentCond = quer.createCondition({
                    fieldId: "parent",
                    operator: query.Operator.EMPTY_NOT
                });
            }
            let notElim = quer.createCondition({
                fieldId: "iselimination",
                operator: query.Operator.IS,
                values: false
            });
            quer.condition = quer.and(parentCond, notElim);
            quer.columns = [
                quer.createColumn({
                    fieldId: "id"
                })
            ];

            return quer.run().asMappedResults();
        } catch (e) {
            log.error({
                title: "ERROR GETTING CHILDREN",
                details: e
            });
        }
    };

    return { onRequest };
});
