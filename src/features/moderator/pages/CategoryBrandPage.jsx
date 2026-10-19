import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Button from '../../../components/common/Button.jsx';
import Modal from '../../../components/common/Modal.jsx';
import CatalogEditor from '../phase2/CatalogEditor.jsx';
import { catalogService } from '../phase2/api.js';
import { phase2Contract, isFixtureMode } from '../phase2/contract.js';
import { useResource } from '../phase2/hooks.jsx';
import { Page, Card, Status, ResourceState } from '../phase2/ui.jsx';

export default function CategoryBrandPage() {
  const [search, setSearch] = useSearchParams();
  const kind = search.get('tab') === 'brands' ? 'brand' : 'category';
  const resource = useResource((options) => catalogService.list(options), []);
  const enums = useResource(
    async () =>
      isFixtureMode
        ? (await import('../phase2/fixtures.js')).fixtureOptions
        : phase2Contract.options,
    [],
  );
  const [editor, setEditor] = useState(null),
    [hiding, setHiding] = useState(null);
  const items = resource.data?.[kind === 'category' ? 'categories' : 'brands'] || [];
  return (
    <Page
      title="Danh mục & thương hiệu"
      subtitle="Ẩn mục khỏi lựa chọn mới, giữ tham chiếu lịch sử."
      actions={
        <Button onClick={() => setEditor({ kind, item: null })}>
          Thêm {kind === 'category' ? 'danh mục' : 'thương hiệu'}
        </Button>
      }
    >
      <div className="flex gap-3">
        <Button
          variant={kind === 'category' ? 'primary' : 'outline'}
          onClick={() => setSearch({ tab: 'categories' })}
        >
          Danh mục
        </Button>
        <Button
          variant={kind === 'brand' ? 'primary' : 'outline'}
          onClick={() => setSearch({ tab: 'brands' })}
        >
          Thương hiệu
        </Button>
      </div>
      <ResourceState resource={resource} empty={!items.length} />
      <Card>
        {items.map((item) => (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral py-3"
            key={item.id}
          >
            <div>
              <p className="font-semibold">{item.name}</p>
              {item.slot && <p className="text-sm">{item.slot}</p>}
              <Status>{item.hidden ? 'Đã ẩn' : 'Đang sử dụng'}</Status>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditor({ kind, item })}>
                Sửa
              </Button>
              <Button
                variant="danger"
                disabled={item.hidden}
                onClick={() => setHiding({ kind, item })}
              >
                Ẩn
              </Button>
            </div>
          </div>
        ))}
      </Card>
      {editor && (
        <CatalogEditor
          {...editor}
          slots={enums.data?.categorySlots || []}
          onClose={() => setEditor(null)}
          onSaved={resource.refresh}
        />
      )}
      <Modal
        isOpen={!!hiding}
        onClose={() => {
          if (!resource.busy) setHiding(null);
        }}
        title="Xác nhận ẩn"
      >
        <p className="mb-4">Ẩn “{hiding?.item.name}” khỏi các lựa chọn mới?</p>
        <ResourceState resource={resource} />
        <Button
          variant="danger"
          loading={resource.busy}
          onClick={() =>
            resource.mutate(
              (options) => catalogService.hide(hiding.kind, hiding.item.id, options),
              { onSuccess: () => setHiding(null) },
            )
          }
        >
          Xác nhận ẩn
        </Button>
      </Modal>
    </Page>
  );
}
