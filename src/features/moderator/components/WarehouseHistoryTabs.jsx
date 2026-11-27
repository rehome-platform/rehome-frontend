import React from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import { useResource } from '../hooks/warehouseHooks.jsx';
import { warehouseHistoryService } from '../services/warehouseHistoryApi.js';
import { listItems } from '../models/warehouseModel.js';
import { mapWarehouseHistoryRow } from '../models/historyTableModel.js';
import { Pager, ResourceState } from './WarehouseUi.jsx';
import { ModeratorHistoryTable } from './ModeratorHistoryTable.jsx';

export { ModeratorHistoryTable };

export function WarehouseHistoryTabs({
  type,
  children,
  onWorkTabClick,
  historySource,
  historyCount,
  tabBarExtra,
  tabListLabel = 'Công việc và lịch sử',
  emptyText = 'Chưa có lịch sử thao tác.',
  sectionLabel = 'Lịch sử thao tác điểm kí gửi',
}) {
  const [search, setSearch] = useSearchParams();
  const history = search.get('view') === 'history';
  const page = Math.max(0, Number(search.get('historyPage')) || 0);
  const isCustomMode = Boolean(historySource);

  const resource = useResource(
    (options) => warehouseHistoryService.list(type, { page, size: 20 }, options),
    [type, page],
    {
      enabled: history && !isCustomMode && Boolean(type),
      cacheKey: `history:${type}:${page}`,
    },
  );

  const serverRows = React.useMemo(
    () => (resource.data?.content ?? listItems(resource.data)).map(mapWarehouseHistoryRow),
    [resource.data],
  );

  const customPageSize = historySource?.pageSize || 20;
  const customAllRows = historySource?.rows || [];
  const customHasExternalTotalPages = historySource?.totalPages != null;
  const customTotalPages = customHasExternalTotalPages
    ? Math.max(1, Number(historySource.totalPages) || 1)
    : Math.max(1, Math.ceil(customAllRows.length / customPageSize));
  const customCurrentPage = Math.min(page, customTotalPages - 1);
  const customPagedRows = customHasExternalTotalPages
    ? customAllRows
    : customAllRows.slice(
        customCurrentPage * customPageSize,
        (customCurrentPage + 1) * customPageSize,
      );

  const rows = isCustomMode ? customPagedRows : serverRows;
  const currentPage = isCustomMode ? customCurrentPage : page;
  const totalPages = isCustomMode
    ? customTotalPages
    : Math.max(1, Number(resource.data?.totalPages) || 1);
  const showPager = isCustomMode
    ? !historySource.loading && !historySource.error
    : Boolean(resource.data);

  const handleWorkClick = () => {
    if (onWorkTabClick) {
      onWorkTabClick();
      return;
    }
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      next.delete('view');
      next.delete('historyPage');
      return next;
    });
  };

  const handleHistoryClick = () => {
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      next.set('view', 'history');
      return next;
    });
  };

  const handlePageChange = (value) => {
    const targetPage = Math.max(0, Number(value) || 0);
    setSearch((previous) => {
      const next = new URLSearchParams(previous);
      next.set('view', 'history');
      next.set('historyPage', String(targetPage));
      return next;
    });
  };

  const historyTabLabel =
    historyCount != null ? `Lịch sử (${historyCount})` : 'Lịch sử';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={tabListLabel} className="flex flex-wrap gap-2">
          <Button
            role="tab"
            size="sm"
            aria-selected={!history}
            variant={history ? 'outline' : 'primary'}
            className="whitespace-nowrap"
            onClick={handleWorkClick}
          >
            Công việc
          </Button>
          <Button
            role="tab"
            size="sm"
            aria-selected={history}
            variant={history ? 'primary' : 'outline'}
            className="whitespace-nowrap"
            onClick={handleHistoryClick}
          >
            {historyTabLabel}
          </Button>
        </div>
        {tabBarExtra}
      </div>

      {history ? (
        <section
          aria-label={historySource?.sectionLabel || sectionLabel}
          className="space-y-4"
        >
          {isCustomMode ? (
            historySource.error ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-center justify-between gap-3"
              >
                <span>{historySource.error}</span>
                {historySource.onRefresh && (
                  <Button variant="outline" size="sm" onClick={historySource.onRefresh}>
                    Thử lại
                  </Button>
                )}
              </div>
            ) : (
              <ModeratorHistoryTable
                rows={rows}
                loading={Boolean(historySource.loading)}
                emptyText={historySource.emptyText || emptyText}
              />
            )
          ) : (
            <>
              <ResourceState resource={resource} />
              {!resource.loading && !resource.error && (
                <ModeratorHistoryTable rows={rows} emptyText={emptyText} />
              )}
            </>
          )}

          {showPager && (
            <Pager
              page={currentPage}
              totalPages={totalPages}
              onChange={handlePageChange}
            />
          )}
        </section>
      ) : (
        children
      )}
    </div>
  );
}
