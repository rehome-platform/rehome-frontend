import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import QRScannerModal from '../../../components/QRScannerModal.jsx';
import { inventoryService } from '../phase2/api.js';
import { phase2Contract, isFixtureMode } from '../phase2/contract.js';
import { useResource } from '../phase2/hooks.jsx';
import { listItems } from '../phase2/model.js';
import { Page, Card, Field, Status, Pager, ResourceState, money } from '../phase2/ui.jsx';

export default function WarehouseInventoryPage() {
  const [search, setSearch] = useSearchParams(),
    navigate = useNavigate();
  const [scanner, setScanner] = useState(false);
  const page = Math.max(0, Number(search.get('page')) || 0),
    sku = search.get('sku') || '',
    status = search.get('status') || '',
    shelf = search.get('shelf') || '';
  const resource = useResource(
    (options) => inventoryService.list({ page, sku, status, shelf }, options),
    [page, sku, status, shelf],
  );
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../phase2/fixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const items = listItems(resource.data);
  const change = (key, value) =>
    setSearch(
      (previous) => {
        const next = new URLSearchParams(previous);
        value ? next.set(key, value) : next.delete(key);
        if (key !== 'page') next.set('page', '0');
        return next;
      },
      { replace: true },
    );
  return (
    <Page
      title="Tồn kho"
      subtitle="Tra SKU, vị trí kệ và trạng thái từ kho đang làm việc."
      actions={
        <Button variant="outline" onClick={resource.refresh}>
          Tải lại
        </Button>
      }
    >
      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="SKU" value={sku} onChange={(event) => change('sku', event.target.value)} />
          <Field
            label="Vị trí kệ"
            value={shelf}
            onChange={(event) => change('shelf', event.target.value)}
          />
          <Field label="Trạng thái">
            <select
              className="w-full rounded-xl border-neutral"
              value={status}
              onChange={(event) => change('status', event.target.value)}
            >
              <option value="">Tất cả</option>
              {(enums.data?.inventoryStatuses || []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Button variant="outline" onClick={() => setScanner(true)}>
          Quét QR SKU
        </Button>
      </Card>
      <ResourceState resource={resource} empty={!items.length} />
      {!!items.length && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-[650px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral">
                  <th className="py-3">SKU / sản phẩm</th>
                  <th>Kệ</th>
                  <th>Giá</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr className="border-b border-neutral" key={item.sku}>
                    <td className="py-4">
                      <Link
                        className="text-primary underline"
                        to={`/moderator/inventory/${encodeURIComponent(item.sku)}`}
                      >
                        {item.sku}
                      </Link>
                      <p>{item.name}</p>
                    </td>
                    <td>{item.shelfLocation}</td>
                    <td>{money(item.agreedPrice)}</td>
                    <td>
                      <Status>{item.status}</Status>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {!!resource.data && (
        <Pager
          page={page}
          totalPages={resource.data.totalPages}
          onChange={(value) => change('page', String(value))}
        />
      )}
      <QRScannerModal
        isOpen={scanner}
        onClose={() => setScanner(false)}
        title="Quét QR SKU sản phẩm"
        placeholder="Nhập SKU sản phẩm"
        onScanSuccess={(value) => {
          setScanner(false);
          navigate(`/moderator/inventory/${encodeURIComponent(value)}`);
        }}
      />
    </Page>
  );
}
