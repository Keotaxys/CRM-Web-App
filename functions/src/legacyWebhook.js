export async function syncLegacyCustomerOperation({ db }, actor, data, webhookUrl) {
  if (!data?.customerId) throw new Error('Customer ID required');
  const snapshot = await db.doc(`customers/${data.customerId}`).get();
  if (!snapshot.exists) throw new Error('Customer not found');
  const customer = snapshot.data();
  if (actor.role !== 'admin' && actor.branchId !== customer.branchId) throw new Error('Cross-branch sync denied');
  if (!webhookUrl) throw new Error('Legacy webhook secret is not configured');
  const createdAt = customer.createdAt?.toDate?.() ?? customer.createdAt ?? null;
  const response = await fetch(webhookUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: snapshot.id, name: customer.name, phone: customer.phone, address: customer.address, priority: customer.priority || 'ທົ່ວໄປ', status: customer.status, branch: customer.branch, note: customer.note, createdAt: createdAt ? new Date(createdAt).toLocaleString('en-GB', { timeZone: 'Asia/Vientiane' }) : '' }) });
  if (!response.ok) throw new Error(`Legacy webhook rejected request (${response.status})`);
  return { id: snapshot.id, synced: true };
}
