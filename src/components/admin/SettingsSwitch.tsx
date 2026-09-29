"use client";

export function SettingsSwitch({
  name,
  checked,
  defaultChecked,
  onChange,
  disabled,
  labelledBy,
}: {
  name?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  labelledBy?: string;
}) {
  const controlled = checked !== undefined;
  return (
    <span className={`settings-switch ${disabled ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        name={name}
        value="1"
        className="peer sr-only"
        checked={controlled ? checked : undefined}
        defaultChecked={controlled ? undefined : defaultChecked}
        disabled={disabled}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        aria-labelledby={labelledBy}
      />
      <span className="settings-switch-track" aria-hidden />
    </span>
  );
}
