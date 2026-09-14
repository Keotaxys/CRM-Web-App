function callableCode(error) {
  return String(error?.code ?? '').replace(/^functions\//, '');
}

export function giftCallableMessage(error) {
  const code = callableCode(error);
  const backendMessage = String(error?.message ?? '');

  if (code === 'permission-denied') return 'ທ່ານບໍ່ມີສິດເຂົ້າເຖິງ ຫຼື ປ່ຽນແປງຂໍ້ມູນນີ້';
  if (code === 'unauthenticated') return 'ກະລຸນາເຂົ້າລະບົບແລ້ວລອງໃໝ່';
  if (code === 'invalid-argument') return 'ຂໍ້ມູນເຄື່ອງແຈກບໍ່ຖືກຕ້ອງ';
  if (code === 'already-exists') return 'ລະຫັດລາຍການນີ້ຖືກນໍາໃຊ້ແລ້ວ';
  if (code === 'not-found') return 'ບໍ່ພົບລາຍການເຄື່ອງແຈກທີ່ຕ້ອງການ';
  if (/insufficient gift stock/i.test(backendMessage)) {
    return 'Stock ເຄື່ອງແຈກບໍ່ພຽງພໍ';
  }
  if (/Laos date changed/i.test(backendMessage)) {
    return 'ວັນທີໄດ້ປ່ຽນແລ້ວ ກະລຸນາໂຫຼດຂໍ້ມູນແລ້ວລອງໃໝ່';
  }
  if (/version changed/i.test(backendMessage)) {
    return 'ລາຍການຖືກແກ້ໄຂໂດຍຄົນອື່ນ ກະລຸນາໂຫຼດຂໍ້ມູນໃໝ່';
  }
  if (code === 'failed-precondition') return 'ບໍ່ສາມາດດໍາເນີນລາຍການເຄື່ອງແຈກນີ້ໄດ້';
  return 'ບັນທຶກຂໍ້ມູນເຄື່ອງແຈກບໍ່ສໍາເລັດ ກະລຸນາລອງໃໝ່';
}
