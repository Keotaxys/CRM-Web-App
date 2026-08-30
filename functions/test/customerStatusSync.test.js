import test from 'node:test';
import assert from 'node:assert/strict';
import { Timestamp } from 'firebase-admin/firestore';
import * as customerAdmin from '../src/customerAdmin.js';

const actor = {
  uid: 'u1',
  role: 'staff',
  branchId: '010',
  accountStatus: 'approved',
};

const currentWindow = () => ({
  startAt: Timestamp.fromMillis(Date.now() - 60_000),
  endAt: Timestamp.fromMillis(Date.now() + 60_000),
});

const laoTimestamp = (value) => Timestamp.fromDate(new Date(value));

const FIXED_LAO_NOW = new Date('2035-01-02T00:15:00+07:00');

function getOperation() {
  assert.equal(
    typeof customerAdmin.changeCustomerStatusOperation,
    'function',
    'changeCustomerStatusOperation must be exported from customerAdmin.js',
  );

  return customerAdmin.changeCustomerStatusOperation;
}

function makeServices({
  customer = {
    branchId: '010',
    recordState: 'active',
    status: 'ຕິດຕາມຕໍ່',
  },
  activities = [],
  now = null,
} = {}) {
  const writes = [];

  const customerRef = {
    id: 'c1',
    path: 'customers/c1',
  };

  const activityRefs = new Map(
    activities.map((activity) => [
      activity.id,
      {
        id: activity.id,
        path: `activities/${activity.id}`,
      },
    ]),
  );

  const db = {
    doc(path) {
      if (path === 'customers/c1') {
        return customerRef;
      }

      if (path.startsWith('activities/')) {
        const id = path.split('/')[1];
        return activityRefs.get(id) ?? {
          id,
          path,
        };
      }

      return {
        path,
      };
    },

    collection(name) {
      assert.equal(name, 'activities');

      return {
        where(field, operator, value) {
          assert.equal(field, 'customerId');
          assert.equal(operator, '==');

          return {
            kind: 'activity-query',
            customerId: value,
          };
        },
      };
    },

    async runTransaction(callback) {
      const transaction = {
        async get(target) {
          if (target === customerRef) {
            return {
              exists: true,
              id: 'c1',
              ref: customerRef,
              data: () => customer,
            };
          }

          if (target?.kind === 'activity-query') {
            const docs = activities
              .filter(
                (activity) =>
                  activity.customerId
                  === target.customerId,
              )
              .map((activity) => ({
                id: activity.id,
                ref: activityRefs.get(activity.id),
                data: () => activity,
              }));

            return {
              empty: docs.length === 0,
              docs,
            };
          }

          throw new Error(
            `Unexpected transaction.get target: ${target?.path ?? 'unknown'}`,
          );
        },

        update(ref, value) {
          writes.push({
            path: ref.path,
            value,
          });
        },
      };

      return callback(transaction);
    },
  };

  const services = {
    db,
  };

  if (now) {
    services.now = () => new Date(now);
  }

  return {
    services,
    writes,
  };
}

function activity(overrides = {}) {
  return {
    id: 'a1',
    customerId: 'c1',
    type: 'customer_visit',
    branchId: '010',
    recordState: 'active',
    status: 'confirmed',
    createdBy: 'u2',
    assignedStaffIds: ['u2'],
    ...currentWindow(),
    ...overrides,
  };
}

test(
  'customer progress status moves the one current confirmed customer visit to in_progress',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity(),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    const customerWrite =
      writes.find(
        (item) =>
          item.path === 'customers/c1',
      );

    const activityWrite =
      writes.find(
        (item) =>
          item.path === 'activities/a1',
      );

    assert.equal(
      customerWrite?.value.status,
      'ດຳເນີນການແລ້ວ',
    );

    assert.equal(
      activityWrite?.value.status,
      'in_progress',
    );

    assert.equal(
      activityWrite?.value.updatedBy,
      'u1',
    );
  },
);

test(
  'planned current customer visit can also move to in_progress',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity({
          status: 'planned',
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'activities/a1',
      )?.value.status,
      'in_progress',
    );
  },
);

test(
  'same-day visit can move to in_progress before its scheduled start time',
  async () => {
    const { services, writes } = makeServices({
      now: FIXED_LAO_NOW,
      activities: [
        activity({
          startAt: laoTimestamp(
            '2035-01-02T10:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-02T11:00:00+07:00',
          ),
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'activities/a1',
      )?.value.status,
      'in_progress',
    );
  },
);

test(
  'same-day visit can move to in_progress after its scheduled end time',
  async () => {
    const { services, writes } = makeServices({
      now: FIXED_LAO_NOW,
      activities: [
        activity({
          startAt: laoTimestamp(
            '2035-01-02T00:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-02T00:05:00+07:00',
          ),
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'activities/a1',
      )?.value.status,
      'in_progress',
    );
  },
);

test(
  'visits on the previous or next Laos calendar day stay untouched',
  async () => {
    const { services, writes } = makeServices({
      now: FIXED_LAO_NOW,
      activities: [
        activity({
          id: 'yesterday',
          startAt: laoTimestamp(
            '2035-01-01T10:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-01T11:00:00+07:00',
          ),
        }),
        activity({
          id: 'tomorrow',
          startAt: laoTimestamp(
            '2035-01-03T10:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-03T11:00:00+07:00',
          ),
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      ).length,
      0,
    );
  },
);

test(
  'completed cancelled and unrelated activities stay untouched',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity({
          id: 'completed',
          status: 'completed',
        }),
        activity({
          id: 'cancelled',
          status: 'cancelled',
        }),
        activity({
          id: 'other-customer',
          customerId: 'c2',
        }),
        activity({
          id: 'other-branch',
          branchId: '019',
        }),
        activity({
          id: 'other-type',
          type: 'follow_up',
        }),
        activity({
          id: 'archived',
          recordState: 'archived',
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      ).length,
      0,
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'customers/c1',
      )?.value.status,
      'ດຳເນີນການແລ້ວ',
    );
  },
);

test(
  'ambiguous multiple current visits are not auto-selected',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity({
          id: 'a1',
        }),
        activity({
          id: 'a2',
          status: 'planned',
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      ).length,
      0,
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'customers/c1',
      )?.value.status,
      'ດຳເນີນການແລ້ວ',
    );
  },
);

test(
  'ambiguous multiple same-day visits are not auto-selected',
  async () => {
    const { services, writes } = makeServices({
      now: FIXED_LAO_NOW,
      activities: [
        activity({
          id: 'a1',
          startAt: laoTimestamp(
            '2035-01-02T09:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-02T10:00:00+07:00',
          ),
        }),
        activity({
          id: 'a2',
          status: 'planned',
          startAt: laoTimestamp(
            '2035-01-02T14:00:00+07:00',
          ),
          endAt: laoTimestamp(
            '2035-01-02T15:00:00+07:00',
          ),
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    assert.equal(
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      ).length,
      0,
    );
  },
);

test(
  'other customer statuses do not change activity status',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity(),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ຕິດຕາມຕໍ່',
      },
    );

    assert.equal(
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      ).length,
      0,
    );
  },
);

test(
  'cross branch actor cannot change customer status',
  async () => {
    const { services, writes } =
      makeServices();

    await assert.rejects(
      () =>
        getOperation()(
          services,
          {
            ...actor,
            branchId: '019',
          },
          {
            id: 'c1',
            status:
              'ດຳເນີນການແລ້ວ',
          },
        ),
      /Cross-branch/i,
    );

    assert.equal(
      writes.length,
      0,
    );
  },
);

test(
  'does not promote another current visit when one is already in_progress',
  async () => {
    const { services, writes } = makeServices({
      activities: [
        activity({
          id: 'already-active',
          status: 'in_progress',
        }),
        activity({
          id: 'candidate',
          status: 'confirmed',
        }),
      ],
    });

    await getOperation()(
      services,
      actor,
      {
        id: 'c1',
        status: 'ດຳເນີນການແລ້ວ',
      },
    );

    const activityWrites =
      writes.filter(
        (item) =>
          item.path.startsWith(
            'activities/',
          ),
      );

    assert.equal(
      activityWrites.length,
      0,
    );

    assert.equal(
      writes.find(
        (item) =>
          item.path === 'customers/c1',
      )?.value.status,
      'ດຳເນີນການແລ້ວ',
    );
  },
);