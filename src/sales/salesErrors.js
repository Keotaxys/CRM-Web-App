export function salesErrorMessage(error, fallback = 'ບໍ່ສາມາດບັນທຶກຍອດຂາຍໄດ້ ກະລຸນາລອງໃໝ່') {
  const code = error?.code?.replace('functions/', '');
  if (code === 'unauthenticated') return 'ກະລຸນາເຂົ້າລະບົບໃໝ່';
  if (code === 'permission-denied') return 'ທ່ານບໍ່ມີສິດບັນທຶກ ຫຼືແກ້ໄຂຍອດນີ້';
  if (code === 'invalid-argument') return 'ກະລຸນາກວດຈຳນວນ ແລະເຫດຜົນໃຫ້ຖືກຕ້ອງ';
  if (code === 'failed-precondition') return 'ຂໍ້ມູນປ່ຽນແລ້ວ ກະລຸນາກວດວັນທີ ແລະຜະລິດຕະພັນທີ່ປິດນຳໃຊ້';
  return fallback;
}
