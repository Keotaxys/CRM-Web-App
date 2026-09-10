import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const MONTH_NAMES = [
  'ມັງກອນ',
  'ກຸມພາ',
  'ມີນາ',
  'ເມສາ',
  'ພຶດສະພາ',
  'ມິຖຸນາ',
  'ກໍລະກົດ',
  'ສິງຫາ',
  'ກັນຍາ',
  'ຕຸລາ',
  'ພະຈິກ',
  'ທັນວາ',
];

const WEEKDAY_NAMES = [
  'ອາ',
  'ຈ',
  'ອ',
  'ພ',
  'ພຫ',
  'ສ',
  'ສ',
];

const DEFAULT_MIN_YEAR = 1900;

const DEFAULT_FUTURE_YEAR_SPAN = 100;

function pad2(value) {
  return String(value).padStart(2, '0');
}

function datePartsFromValue(value) {
  const datePart =
    typeof value === 'string'
      ? value.slice(0, 10)
      : '';

  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      datePart,
    );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function timePartsFromValue(value) {
  const match =
    /T(\d{2}):(\d{2})/.exec(
      typeof value === 'string'
        ? value
        : '',
    );

  if (!match) {
    return {
      hour: '00',
      minute: '00',
    };
  }

  return {
    hour: match[1],
    minute: match[2],
  };
}

function todayParts() {
  const now = new Date();

  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  };
}

function toDateValue({
  year,
  month,
  day,
}) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function displayDate(value) {
  const parts =
    datePartsFromValue(value);

  if (!parts) {
    return '';
  }

  return [
    pad2(parts.day),
    pad2(parts.month),
    parts.year,
  ].join('/');
}

function displayValue(
  value,
  type,
) {
  const dateText =
    displayDate(value);

  if (!dateText) {
    return '';
  }

  if (type !== 'datetime-local') {
    return dateText;
  }

  const time =
    timePartsFromValue(value);

  return `${dateText} ${time.hour}:${time.minute}`;
}

function daysInMonth(
  year,
  month,
) {
  return new Date(
    year,
    month,
    0,
  ).getDate();
}

function firstWeekday(
  year,
  month,
) {
  return new Date(
    year,
    month - 1,
    1,
  ).getDay();
}

function clampNumberString(
  value,
  min,
  max,
) {
  if (value === '') {
    return '';
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return '';
  }

  return String(
    Math.min(
      max,
      Math.max(min, parsed),
    ),
  );
}

function dateOnlyBoundary(value) {
  if (
    typeof value !== 'string'
    || value.length < 10
  ) {
    return null;
  }

  const candidate =
    value.slice(0, 10);

  return /^\d{4}-\d{2}-\d{2}$/.test(
    candidate,
  )
    ? candidate
    : null;
}

function isDateDisabled(
  dateValue,
  min,
  max,
) {
  const minDate =
    dateOnlyBoundary(min);

  const maxDate =
    dateOnlyBoundary(max);

  if (
    minDate
    && dateValue < minDate
  ) {
    return true;
  }

  if (
    maxDate
    && dateValue > maxDate
  ) {
    return true;
  }

  return false;
}

function isMonthDisabled(
  year,
  month,
  min,
  max,
) {
  const firstDay =
    toDateValue({
      year,
      month,
      day: 1,
    });

  const lastDay =
    toDateValue({
      year,
      month,
      day: daysInMonth(
        year,
        month,
      ),
    });

  const minDate =
    dateOnlyBoundary(min);

  const maxDate =
    dateOnlyBoundary(max);

  return Boolean(
    (minDate && lastDay < minDate)
    || (maxDate && firstDay > maxDate),
  );
}

function makeChangeEvent(
  id,
  value,
) {
  const target = {
    id,
    name: id,
    value,
  };

  return {
    target,
    currentTarget: target,
  };
}

const DateField =
  forwardRef(function DateField(
    {
      id,
      type = 'date',
      label,
      value,
      onChange,
      error,
      hint,
      min,
      max,
      required = false,
      disabled = false,
    },
    forwardedRef,
  ) {
    const inputRef =
      useRef(null);

    const dialogRef =
      useRef(null);

    const yearListRef =
      useRef(null);

    const [open, setOpen] =
      useState(false);

    const [
      choosingMonthYear,
      setChoosingMonthYear,
    ] = useState(false);

    const initialDate =
      datePartsFromValue(value)
      ?? todayParts();

    const initialTime =
      timePartsFromValue(value);

    const [viewYear, setViewYear] =
      useState(initialDate.year);

    const [viewMonth, setViewMonth] =
      useState(initialDate.month);

    const [
      draftDate,
      setDraftDate,
    ] = useState(
      toDateValue(initialDate),
    );

    const [
      draftHour,
      setDraftHour,
    ] = useState(
      initialTime.hour,
    );

    const [
      draftMinute,
      setDraftMinute,
    ] = useState(
      initialTime.minute,
    );

    const describedBy = [
      hint && `${id}-hint`,
      error && `${id}-error`,
    ]
      .filter(Boolean)
      .join(' ')
      || undefined;

    const isDateTime =
      type === 'datetime-local';

    const pickerMin =
      dateOnlyBoundary(min)
      ?? `${DEFAULT_MIN_YEAR}-01-01`;

    const pickerMax =
      dateOnlyBoundary(max)
      ?? `${todayParts().year + DEFAULT_FUTURE_YEAR_SPAN}-12-31`;

    const setInputRef =
      useCallback(
        (node) => {
          inputRef.current = node;

          if (
            typeof forwardedRef
            === 'function'
          ) {
            forwardedRef(node);
          } else if (
            forwardedRef
          ) {
            forwardedRef.current =
              node;
          }
        },
        [forwardedRef],
      );

    const resetDraft =
      useCallback(() => {
        const nextDate =
          datePartsFromValue(value)
          ?? todayParts();

        const nextTime =
          timePartsFromValue(value);

        setDraftDate(
          toDateValue(nextDate),
        );

        setViewYear(
          nextDate.year,
        );

        setViewMonth(
          nextDate.month,
        );

        setDraftHour(
          nextTime.hour,
        );

        setDraftMinute(
          nextTime.minute,
        );

        setChoosingMonthYear(
          false,
        );
      }, [value]);

    const openPicker = () => {
      if (disabled) {
        return;
      }

      resetDraft();
      setOpen(true);
    };

    const closePicker = () => {
      setChoosingMonthYear(false);
      setOpen(false);
    };

    const selectableYears =
      useMemo(() => {
        const minYear =
          datePartsFromValue(
            pickerMin,
          ).year;

        const maxYear =
          datePartsFromValue(
            pickerMax,
          ).year;

        return Array.from(
          {
            length:
              maxYear
              - minYear
              + 1,
          },
          (_, index) =>
            maxYear - index,
        );
      }, [pickerMax, pickerMin]);

    useEffect(() => {
      if (!open) {
        return undefined;
      }

      const handleKeyDown = (
        event,
      ) => {
        if (
          event.key === 'Escape'
        ) {
          event.preventDefault();
          closePicker();
        }
      };

      document.addEventListener(
        'keydown',
        handleKeyDown,
      );

      return () => {
        document.removeEventListener(
          'keydown',
          handleKeyDown,
        );
      };
    }, [open]);

    useEffect(() => {
      if (!open) {
        return;
      }

      const frame =
        requestAnimationFrame(
          () => {
            dialogRef.current?.focus();
          },
        );

      return () => {
        cancelAnimationFrame(
          frame,
        );
      };
    }, [open]);

    useEffect(() => {
      if (!choosingMonthYear) {
        return undefined;
      }

      const frame =
        requestAnimationFrame(
          () => {
            yearListRef.current
              ?.querySelector(
                '[aria-selected="true"]',
              )
              ?.scrollIntoView?.({
                block: 'center',
              });
          },
        );

      return () => {
        cancelAnimationFrame(
          frame,
        );
      };
    }, [choosingMonthYear]);

    const calendarDays =
      useMemo(() => {
        const count =
          daysInMonth(
            viewYear,
            viewMonth,
          );

        const offset =
          firstWeekday(
            viewYear,
            viewMonth,
          );

        const cells = [];

        for (
          let index = 0;
          index < offset;
          index += 1
        ) {
          cells.push({
            key: `blank-${index}`,
            blank: true,
          });
        }

        for (
          let day = 1;
          day <= count;
          day += 1
        ) {
          const dateValue =
            toDateValue({
              year: viewYear,
              month: viewMonth,
              day,
            });

          cells.push({
            key: dateValue,
            blank: false,
            day,
            value: dateValue,
            disabled:
              isDateDisabled(
                dateValue,
                min,
                max,
              ),
          });
        }

        while (
          cells.length % 7 !== 0
        ) {
          cells.push({
            key:
              `blank-end-${cells.length}`,
            blank: true,
          });
        }

        return cells;
      }, [
        max,
        min,
        viewMonth,
        viewYear,
      ]);

    const previousView = {
      year:
        viewMonth === 1
          ? viewYear - 1
          : viewYear,
      month:
        viewMonth === 1
          ? 12
          : viewMonth - 1,
    };

    const nextView = {
      year:
        viewMonth === 12
          ? viewYear + 1
          : viewYear,
      month:
        viewMonth === 12
          ? 1
          : viewMonth + 1,
    };

    const previousMonthDisabled =
      isMonthDisabled(
        previousView.year,
        previousView.month,
        pickerMin,
        pickerMax,
      );

    const nextMonthDisabled =
      isMonthDisabled(
        nextView.year,
        nextView.month,
        pickerMin,
        pickerMax,
      );

    const previousMonth = () => {
      if (previousMonthDisabled) {
        return;
      }

      if (viewMonth === 1) {
        setViewMonth(12);
        setViewYear(
          (year) => year - 1,
        );
        return;
      }

      setViewMonth(
        (month) => month - 1,
      );
    };

    const nextMonth = () => {
      if (nextMonthDisabled) {
        return;
      }

      if (viewMonth === 12) {
        setViewMonth(1);
        setViewYear(
          (year) => year + 1,
        );
        return;
      }

      setViewMonth(
        (month) => month + 1,
      );
    };

    const confirm = () => {
      if (
        !draftDate
        || isDateDisabled(
          draftDate,
          min,
          max,
        )
      ) {
        return;
      }

      let nextValue =
        draftDate;

      if (isDateTime) {
        const hour =
          pad2(
            Number(
              clampNumberString(
                draftHour || '0',
                0,
                23,
              ),
            ),
          );

        const minute =
          pad2(
            Number(
              clampNumberString(
                draftMinute || '0',
                0,
                59,
              ),
            ),
          );

        nextValue =
          `${draftDate}T${hour}:${minute}`;
      }

      onChange?.(
        makeChangeEvent(
          id,
          nextValue,
        ),
      );

      setOpen(false);
    };

    const dialogLabel =
      isDateTime
        ? `ເລືອກວັນທີ ແລະ ເວລາ ${label}`
        : `ເລືອກວັນທີ ${label}`;

    return (
      <div className="ui-field ui-date-field">
        <label
          className="ui-field__label"
          htmlFor={id}
        >
          {label}
        </label>

        <div className="ui-date-field__control">
          <input
            ref={setInputRef}
            id={id}
            type="text"
            value={displayValue(
              value,
              type,
            )}
            readOnly
            required={required}
            disabled={disabled}
            className="ui-input ui-date-field__input"
            aria-describedby={
              describedBy
            }
            aria-invalid={
              error
                ? true
                : undefined
            }
            onClick={
              disabled
                ? undefined
                : openPicker
            }
          />

          <button
            type="button"
            className="ui-date-field__picker"
            aria-label={
              `ເປີດປະຕິທິນ ${label}`
            }
            onClick={openPicker}
            disabled={disabled}
          >
            <span
              className="material-symbols-outlined"
              aria-hidden="true"
            >
              calendar_month
            </span>
          </button>
        </div>

        {hint ? (
          <p
            id={`${id}-hint`}
            className="ui-field__hint"
          >
            {hint}
          </p>
        ) : null}

        {error ? (
          <p
            id={`${id}-error`}
            className="ui-field__error"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {open ? (
          <div
            className="ui-date-picker__backdrop"
            onMouseDown={(event) => {
              if (
                event.target
                === event.currentTarget
              ) {
                closePicker();
              }
            }}
          >
            <div
              ref={dialogRef}
              className="ui-date-picker"
              role="dialog"
              aria-modal="true"
              aria-label={
                dialogLabel
              }
              tabIndex={-1}
            >
              <div className="ui-date-picker__header">
                <div>
                  <p className="ui-date-picker__eyebrow">
                    {isDateTime
                      ? 'ເລືອກວັນທີ ແລະ ເວລາ'
                      : 'ເລືອກວັນທີ'}
                  </p>

                  <h2 className="ui-date-picker__title">
                    {label}
                  </h2>
                </div>

                <button
                  type="button"
                  className="ui-date-picker__close"
                  aria-label="ປິດ"
                  onClick={
                    closePicker
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    close
                  </span>
                </button>
              </div>

              <div className="ui-date-picker__month-nav">
                <button
                  type="button"
                  className="ui-date-picker__nav-button"
                  aria-label="ເດືອນກ່ອນໜ້າ"
                  onClick={
                    previousMonth
                  }
                  disabled={
                    previousMonthDisabled
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    chevron_left
                  </span>
                </button>

                <button
                  type="button"
                  className="ui-date-picker__month-title"
                  aria-label={`ເລືອກເດືອນ ແລະ ປີ ${MONTH_NAMES[viewMonth - 1]} ${viewYear}`}
                  aria-expanded={
                    choosingMonthYear
                  }
                  onClick={() => {
                    setChoosingMonthYear(
                      (current) =>
                        !current,
                    );
                  }}
                >
                  {
                    MONTH_NAMES[
                      viewMonth - 1
                    ]
                  }{' '}
                  {viewYear}

                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    {choosingMonthYear
                      ? 'expand_less'
                      : 'expand_more'}
                  </span>
                </button>

                <button
                  type="button"
                  className="ui-date-picker__nav-button"
                  aria-label="ເດືອນຖັດໄປ"
                  onClick={
                    nextMonth
                  }
                  disabled={
                    nextMonthDisabled
                  }
                >
                  <span
                    className="material-symbols-outlined"
                    aria-hidden="true"
                  >
                    chevron_right
                  </span>
                </button>
              </div>

              {choosingMonthYear ? (
                <section
                  className="ui-date-picker__month-year"
                  aria-label="ເລືອກເດືອນ ແລະ ປີ"
                >
                  <div className="ui-date-picker__year-field">
                    <span>ປີ</span>

                    <div
                      ref={yearListRef}
                      className="ui-date-picker__year-list"
                      role="listbox"
                      aria-label="ປີ"
                    >
                      {selectableYears.map(
                        (year) => (
                          <button
                            key={year}
                            type="button"
                            role="option"
                            className={[
                              'ui-date-picker__year-option',
                              year
                                === viewYear
                                ? 'is-selected'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-selected={
                              year
                              === viewYear
                            }
                            onClick={() => {
                              setViewYear(
                                year,
                              );
                            }}
                          >
                            {year}
                          </button>
                        ),
                      )}
                    </div>
                  </div>

                  <div className="ui-date-picker__month-grid">
                    {MONTH_NAMES.map(
                      (
                        monthName,
                        index,
                      ) => {
                        const month =
                          index + 1;

                        const unavailable =
                          isMonthDisabled(
                            viewYear,
                            month,
                            pickerMin,
                            pickerMax,
                          );

                        return (
                          <button
                            key={monthName}
                            type="button"
                            className={[
                              'ui-date-picker__month-option',
                              month
                                === viewMonth
                                ? 'is-selected'
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            aria-label={`ເລືອກເດືອນ ${monthName}`}
                            aria-pressed={
                              month
                              === viewMonth
                            }
                            disabled={
                              unavailable
                            }
                            onClick={() => {
                              setViewMonth(
                                month,
                              );
                              setChoosingMonthYear(
                                false,
                              );
                            }}
                          >
                            {monthName}
                          </button>
                        );
                      },
                    )}
                  </div>
                </section>
              ) : (
                <>
                  <div className="ui-date-picker__weekdays">
                    {WEEKDAY_NAMES.map(
                      (
                        weekday,
                        index,
                      ) => (
                        <span
                          key={`${weekday}-${index}`}
                        >
                          {weekday}
                        </span>
                      ),
                    )}
                  </div>

                  <div className="ui-date-picker__calendar">
                    {calendarDays.map(
                      (item) => {
                        if (
                          item.blank
                        ) {
                          return (
                            <span
                              key={
                                item.key
                              }
                              className="ui-date-picker__blank"
                              aria-hidden="true"
                            />
                          );
                        }

                        const selected =
                          item.value
                          === draftDate;

                        return (
                          <button
                            key={
                              item.key
                            }
                            type="button"
                            className={[
                              'ui-date-picker__day',
                              selected
                                ? 'is-selected'
                                : '',
                            ]
                              .filter(
                                Boolean,
                              )
                              .join(' ')}
                            aria-label={
                              `ເລືອກ ${item.value}`
                            }
                            aria-pressed={
                              selected
                            }
                            disabled={
                              item.disabled
                            }
                            onClick={() => {
                              setDraftDate(
                                item.value,
                              );
                            }}
                          >
                            {item.day}
                          </button>
                        );
                      },
                    )}
                  </div>
                </>
              )}

              {isDateTime && !choosingMonthYear ? (
                <div className="ui-date-picker__time">
                  <div className="ui-date-picker__time-heading">
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                    >
                      schedule
                    </span>

                    <span>
                      ເວລາ
                    </span>
                  </div>

                  <div className="ui-date-picker__time-controls">
                    <label className="ui-date-picker__time-field">
                      <span>
                        ຊົ່ວໂມງ
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="23"
                        inputMode="numeric"
                        value={
                          draftHour
                        }
                        aria-label="ຊົ່ວໂມງ"
                        onChange={(
                          event,
                        ) => {
                          setDraftHour(
                            event
                              .target
                              .value,
                          );
                        }}
                        onBlur={() => {
                          const next =
                            clampNumberString(
                              draftHour
                              || '0',
                              0,
                              23,
                            );

                          setDraftHour(
                            pad2(
                              Number(
                                next
                                || 0,
                              ),
                            ),
                          );
                        }}
                      />
                    </label>

                    <span
                      className="ui-date-picker__time-separator"
                      aria-hidden="true"
                    >
                      :
                    </span>

                    <label className="ui-date-picker__time-field">
                      <span>
                        ນາທີ
                      </span>

                      <input
                        type="number"
                        min="0"
                        max="59"
                        inputMode="numeric"
                        value={
                          draftMinute
                        }
                        aria-label="ນາທີ"
                        onChange={(
                          event,
                        ) => {
                          setDraftMinute(
                            event
                              .target
                              .value,
                          );
                        }}
                        onBlur={() => {
                          const next =
                            clampNumberString(
                              draftMinute
                              || '0',
                              0,
                              59,
                            );

                          setDraftMinute(
                            pad2(
                              Number(
                                next
                                || 0,
                              ),
                            ),
                          );
                        }}
                      />
                    </label>
                  </div>
                </div>
              ) : null}

              <div className="ui-date-picker__footer">
                <button
                  type="button"
                  className="ui-button ui-button--md ui-button--neutral"
                  onClick={
                    closePicker
                  }
                >
                  ຍົກເລີກ
                </button>

                <button
                  type="button"
                  className="ui-button ui-button--md ui-button--primary"
                  onClick={confirm}
                  disabled={
                    !draftDate
                    || isDateDisabled(
                      draftDate,
                      min,
                      max,
                    )
                  }
                >
                  ຢືນຢັນ
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    );
  });

export default DateField;
