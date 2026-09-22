const LABELS = {
  campaign: 'ແຄມເປນ', active: 'ໃຊ້ງານ', inactive: 'ປິດໃຊ້ງານ',
  name: 'ຊື່ລາຍການ', unitLabel: 'ຫົວໜ່ວຍ', packLabel: 'ຫົວໜ່ວຍຫໍ່',
  unitsPerPack: 'ຈຳນວນຊິ້ນຕໍ່ຫໍ່', sortOrder: 'ລຳດັບສະແດງ', saveItem: 'ບັນທຶກລາຍການ', edit: 'ແກ້ໄຂ',
  campaignName: 'ຊື່ແຄມເປນ', campaignBranch: 'ສາຂາຂອງແຄມເປນ', startDate: 'ວັນເລີ່ມ', endDate: 'ວັນສິ້ນສຸດ',
  campaignNote: 'ໝາຍເຫດແຄມເປນ', saveCampaign: 'ບັນທຶກແຄມເປນ', campaignHistory: 'ປະຫວັດແຄມເປນ',
  stock: 'ສະຕັອກ', lowStock: 'ສະຕັອກໃກ້ໝົດ', lowStockThreshold: 'ຈຳນວນເຕືອນສະຕັອກໃກ້ໝົດ', updateThreshold: 'ອັບເດດຈຳນວນເຕືອນ',
  adjustmentItem: 'ລາຍການປັບສະຕັອກ', adjustmentUnits: 'ຈຳນວນປັບ', adjustmentReason: 'ເຫດຜົນການປັບ', adjustStock: 'ບັນທຶກການປັບສະຕັອກ',
  receiptSource: 'ແຫຼ່ງຮັບເຂົ້າ', receiptReference: 'ເລກອ້າງອີງການຮັບເຂົ້າ', receiveStock: 'ບັນທຶກຮັບເຂົ້າ',
  allocation: 'ການໂອນເຄື່ອງແຈກ', createAllocation: 'ສ້າງລາຍການໂອນ', pendingAllocation: 'ລໍຖ້າຢືນຢັນ', confirmedAllocation: 'ຢືນຢັນແລ້ວ', cancelledAllocation: 'ຍົກເລີກແລ້ວ',
  confirmAllocation: 'ຢືນຢັນການໂອນ', cancelAllocation: 'ຍົກເລີກການໂອນ', confirm: 'ຢືນຢັນ', back: 'ກັບຄືນ', targetBranch: 'ສາຂາປາຍທາງ', reference: 'ເລກອ້າງອີງ', total: 'ລວມ',
  cancelNoStock: 'ການຍົກເລີກບໍ່ປັບສະຕັອກ', confirmUpdatesStock: 'ການຢືນຢັນຈະປັບສະຕັອກ', cancellationReason: 'ເຫດຜົນການຍົກເລີກ',
  movementType: 'ປະເພດການເຄື່ອນໄຫວ', gift: 'ເຄື່ອງແຈກ', delta: 'ຈຳນວນປ່ຽນແປງ', actor: 'ຜູ້ດຳເນີນການ', reason: 'ເຫດຜົນ', currentStock: 'ສະຕັອກປັດຈຸບັນ',
  giftSummary: 'ສະຫຼຸບຕາມເຄື່ອງແຈກ', branchSummary: 'ສະຫຼຸບຕາມສາຂາ', staffSummary: 'ສະຫຼຸບຕາມພະນັກງານ', customerSummary: 'ສະຫຼຸບຕາມລູກຄ້າ', campaignSummary: 'ສະຫຼຸບຕາມແຄມເປນ',
};

const MOVEMENT_LABELS = {
  receive: 'ຮັບເຂົ້າ', allocation_receive: 'ຮັບຈາກການໂອນ', distribute: 'ແຈກ',
  distribution_amend: 'ແກ້ໄຂການແຈກ', distribution_cancel: 'ຍົກເລີກການແຈກ', adjust: 'ປັບສະຕັອກ',
};

export function giftLabel(key) { return LABELS[key] ?? key; }
export function giftMovementLabel(value) { return MOVEMENT_LABELS[value] ?? value; }
