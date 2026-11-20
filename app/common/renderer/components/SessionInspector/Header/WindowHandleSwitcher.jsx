import {IconWindow} from '@tabler/icons-react';
import {Button, Dropdown, Tooltip} from 'antd';
import {useEffect, useState} from 'react';
import {useTranslation} from 'react-i18next';

const LOADING = {status: 'loadingWindows'};

/** Switch between the top-level windows exposed by a WebDriver session. */
const WindowHandleSwitcher = ({executeDriverCommand, applyClientMethod, disabled}) => {
  const {t} = useTranslation();
  const label = t('switchWindow');
  const [open, setOpen] = useState(false);
  const [windows, setWindows] = useState(LOADING);

  if (disabled && open) {
    setOpen(false);
  }

  useEffect(() => {
    if (!open || disabled) {
      return;
    }
    let cancelled = false;
    const loadWindows = async () => {
      try {
        const {commandRes: handles} = await executeDriverCommand({methodName: 'getWindowHandles'});
        if (cancelled) {
          return;
        }
        let current;
        if (handles.length) {
          try {
            ({commandRes: current} = await executeDriverCommand({methodName: 'getWindowHandle'}));
          } catch {
            // The current window may have closed. The remaining handles can still be selected.
          }
        }
        if (!cancelled) {
          setWindows({handles, current});
        }
      } catch {
        if (!cancelled) {
          setWindows({status: 'couldNotLoadWindows'});
        }
      }
    };
    void loadWindows();
    return () => {
      cancelled = true;
    };
  }, [open, disabled, executeDriverCommand]);

  const onOpenChange = (nextOpen) => {
    setWindows(LOADING);
    setOpen(nextOpen);
  };
  const switchWindow = async ({key}) => {
    onOpenChange(false);
    try {
      await applyClientMethod({methodName: 'switchToWindow', args: [key]});
    } catch {
      // The standard command flow reports driver errors. Reopen to get the latest handles.
    }
  };

  const items = windows.handles?.map((handle) => ({key: handle, label: handle, disabled: handle === windows.current}));

  return (
    <Tooltip title={label}>
      <Dropdown
        trigger="click"
        disabled={disabled}
        open={open && !disabled}
        onOpenChange={onOpenChange}
        menu={{
          items: items?.length
            ? items
            : [{key: 'status', label: t(windows.status ?? 'noWindowsFound'), disabled: true}],
          selectable: true,
          selectedKeys: windows.current ? [windows.current] : [],
          onClick: switchWindow,
        }}
      >
        <Button
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open && !disabled}
          disabled={disabled}
          icon={<IconWindow size={18} />}
        />
      </Dropdown>
    </Tooltip>
  );
};

export default WindowHandleSwitcher;
