#!/usr/bin/env node
"use strict";
// Same bounded, narrow M57 recovery, but Web static export; no font changes.
const {runWithFontRetry,executeBuild}=require('./ci-build-export-resilient.cjs');
runWithFontRetry({execute:()=>executeBuild('build'),label:'build Web'}).then(code=>{process.exitCode=code;}).catch(error=>{console.error('Build Web:',error.message);process.exitCode=1;});
