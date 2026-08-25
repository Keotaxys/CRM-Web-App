import test from 'node:test';
import assert from 'node:assert/strict';
import { completeFollowUpOperation } from '../src/activityAdmin.js';

function servicesFor(activity) {
  const updates=[];
  const ref={ get:async()=>({exists:true,data:()=>activity}), update:async(value)=>updates.push(value) };
  return { services:{db:{doc:()=>ref}},updates };
}

test('follow-up reschedule rejects null instead of storing the Unix epoch', async () => {
  const {services}=servicesFor({type:'customer_visit',branchId:'010',createdBy:'u1',assignedStaffIds:['u1']});
  await assert.rejects(() => completeFollowUpOperation(services,{uid:'u1',role:'staff',branchId:'010'},{id:'a1',next:{nextAction:'Call',followUpDate:null}}),/follow-up date/i);
});

test('follow-up reschedule stores a valid explicit instant', async () => {
  const {services,updates}=servicesFor({type:'customer_visit',branchId:'010',createdBy:'u1',assignedStaffIds:['u1']});
  await completeFollowUpOperation(services,{uid:'u1',role:'staff',branchId:'010'},{id:'a1',next:{nextAction:'Call',followUpDate:'2026-08-25T02:00:00.000Z'}});
  assert.equal(updates[0].nextAction,'Call');
  assert.equal(updates[0].followUpDate.toDate().toISOString(),'2026-08-25T02:00:00.000Z');
});
