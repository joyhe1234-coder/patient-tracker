import type { ICellRendererParams } from 'ag-grid-community';

/**
 * Custom cell renderer for the statusDate column.
 *
 * Empty cells: shows striped prompt text (e.g., "Date Ordered") with a
 * hover-reveal "Today" button. Clicking "Today" stamps today's date
 * in one click without entering edit mode.
 *
 * Filled cells: shows the formatted date as plain text.
 */

const formatDate = (value: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  return `${month}/${day}/${year}`;
};

const formatTodayDisplay = (): string => {
  const now = new Date();
  return `${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`;
};

const StatusDateRenderer = (params: ICellRendererParams) => {
  const { value, data, node } = params;

  // Filled cell — just show the formatted date
  if (value) {
    return <span>{formatDate(value)}</span>;
  }

  // Empty cell with prompt — show stripe prompt + "Today" button
  const promptText = data?.statusDatePrompt;
  if (promptText) {
    const handleTodayClick = (e: React.MouseEvent) => {
      e.stopPropagation(); // Don't trigger cell click/selection
      // Pass display format (M/D/YYYY) so it goes through valueSetter's
      // parseAndValidateDate pipeline — same as manual entry
      node.setDataValue('statusDate', formatTodayDisplay());
    };

    return (
      <div className="status-date-renderer">
        <span className="status-date-prompt" title={promptText}>{promptText}</span>
        <button
          className="status-date-today-btn"
          onClick={handleTodayClick}
          title="Set to today's date"
        >
          Today
        </button>
      </div>
    );
  }

  // Empty cell without prompt — show nothing
  return null;
};

StatusDateRenderer.displayName = 'StatusDateRenderer';

export default StatusDateRenderer;
