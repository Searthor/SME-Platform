import { uiTranslations } from '~/utils/i18n-ui'

export const LOCALE_STORAGE_KEY = 'sme-flow:locale:v1'
export const LOCALE_COOKIE_KEY = 'sme_locale'

export type SupportedLocale = 'lo' | 'en' | 'th' | 'zh' | 'vi'

export interface LocaleOption {
  code: SupportedLocale
  name: string
  nativeName: string
  flag: string
  label: string
}

export const supportedLocales: readonly LocaleOption[] = [
  { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', label: 'ພາສາລາວ' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', label: 'English' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', label: 'ພາສາໄທ (ไทย)' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', label: 'ພາສາຈີນ (中文)' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', flag: '🇻🇳', label: 'ພາສາຫວຽດ (Tiếng Việt)' },
] as const

export const defaultLocale: SupportedLocale = 'lo'

export const isSupportedLocale = (value: unknown): value is SupportedLocale => {
  return supportedLocales.some(option => option.code === value)
}

export const normalizeLocale = (value: unknown): SupportedLocale => {
  if (typeof value === 'string' && isSupportedLocale(value)) {
    return value
  }
  return defaultLocale
}

const defaultLocaleOption: LocaleOption = { code: 'lo', name: 'Lao', nativeName: 'ພາສາລາວ', flag: '🇱🇦', label: 'ພາສາລາວ' }

export const getLocaleOption = (code: SupportedLocale): LocaleOption => {
  return supportedLocales.find(item => item.code === code) ?? defaultLocaleOption
}

const baseTranslations: Record<SupportedLocale, Record<string, string>> = {
  lo: {
    // Navigation
    'nav.dashboard': 'ໜ້າຫຼັກ',
    'nav.products': 'ສິນຄ້າ',
    'nav.business': 'ທຸລະກິດ ແລະສາຂາ',
    'nav.members': 'ສະມາຊິກ',
    'nav.roles': 'Role ແລະສິດ',
    'nav.security': 'ຄວາມປອດໄພ',
    'nav.activity': 'ກິດຈະກຳ',
    'nav.platform_dashboard': 'ແຜງຄວບຄຸມ',
    'nav.platform_businesses': 'ທຸລະກິດ',
    'nav.platform_users': 'ຜູ້ໃຊ້ລະບົບ',
    'nav.platform_security': 'ຄວາມປອດໄພ',
    'nav.platform_activity': 'ບັນທຶກກິດຈະກຳ',
    'nav.platform_settings': 'ຕັ້ງຄ່າລະບົບ',

    // Headers & Common actions
    'header.search_placeholder': 'ຄົ້ນຫາເມນູ...',
    'header.business_workspace': 'Business workspace',
    'header.platform_management': 'Platform management',
    'header.platform_console': 'Platform console',
    'header.platform_dashboard_sub': 'ແຜງຄວບຄຸມລະບົບ',
    'header.switch_business': 'ປ່ຽນທຸລະກິດ',
    'header.logout': 'ອອກລະບົບ',
    'header.notifications': 'ການແຈ້ງເຕືອນ',
    'header.language': 'ພາສາ',
    'header.soon': 'SOON',

    // UI Preferences Menu
    'pref.title': 'ຮູບແບບໜ້າຈໍ',
    'pref.hint': 'ຈື່ຄ່າໄວ້ໃນ browser ນີ້',
    'pref.default': 'ຄ່າເລີ່ມຕົ້ນ',
    'pref.size': 'ຂະໜາດ',
    'pref.color': 'ສີຫຼັກ',
    'pref.button_tooltip': 'ປັບຮູບແບບໜ້າຈໍ',

    // Language selector
    'lang.select_language': 'ເລືອກພາສາ',
    'lang.language_settings': 'ຕັ້ງຄ່າພາສາ',

    // Dashboard
    'dash.welcome': 'ສະບາຍດີ',
    'dash.welcome_sub': 'ຍິນດີຕ້ອນຮັບສູ່ workspace ຂອງທ່ານ. ເລີ່ມຈັດການຂໍ້ມູນທຸລະກິດໄດ້ຈາກເມນູດ້ານຊ້າຍ.',
    'dash.account_status': 'ສະຖານະບັນຊີ',
    'dash.ready_to_use': 'ພ້ອມໃຊ້ງານ',
    'dash.accessible_branches': 'ສາຂາທີ່ເຂົ້າເຖິງ',
    'dash.all_branches': 'ທຸກສາຂາ',
    'dash.allowed_branches': 'ສາຂາທີ່ອະນຸຍາດ',
    'dash.currency': 'ສະກຸນເງິນ',
    'dash.currency_note': 'ຄ່າຫຼັກຂອງທຸລະກິດ',
    'dash.user_permissions': 'ສິດຜູ້ໃຊ້',
    'dash.permissions_count': 'Permission ທີ່ມີ',
    'dash.workspace_overview': 'Workspace overview',
    'dash.your_branches': 'ສາຂາຂອງທ່ານ',
    'dash.manage_branches': 'ຈັດການສາຂາ →',
    'dash.no_branches': 'ຍັງບໍ່ມີສາຂາ',
    'dash.no_branches_sub': 'ສ້າງສາຂາທຳອິດເພື່ອເລີ່ມໃຊ້ງານ.',
    'dash.code_prefix': 'ລະຫັດ: ',
    'dash.quick_start': 'Quick start',
    'dash.quick_start_title': 'ຈັດໂຄງສ້າງໃຫ້ພ້ອມ',
    'dash.quick_start_desc': 'ເລີ່ມຈາກສາຂາ, ສະມາຊິກ ແລະເພີ່ມສິນຄ້າຂອງທ່ານ.',
    'dash.add_product': 'ເພີ່ມສິນຄ້າ →',
    'dash.available_now': 'Available now',
    'dash.system_status': 'ສະຖານະລະບົບ',
    'dash.tenant_context': 'Tenant context',
    'dash.role_permission': 'Role & permission',
    'dash.catalog': 'Catalog',

    // Superadmin Settings
    'admin.settings_title': 'ການຕັ້ງຄ່າຫຼັກ',
    'admin.settings_desc': 'Global configuration ສຳລັບ SME Flow',
    'admin.platform_name': 'ຊື່ລະບົບ',
    'admin.support_email': 'Support email',
    'admin.default_locale': 'ພາສາເລີ່ມຕົ້ນ',
    'admin.default_currency': 'ສະກຸນເງິນ',
    'admin.default_timezone': 'Timezone ເລີ່ມຕົ້ນ',
    'admin.timezone_hint': 'ໃຊ້ IANA timezone, ຕົວຢ່າງ: Asia/Vientiane',
    'admin.public_registration': 'ເປີດ public registration',
    'admin.public_reg_hint': 'ເມື່ອປິດ, backend ຈະປະຕິເສດການສະໝັກບັນຊີໃໝ່.',
    'admin.save': 'ບັນທຶກ',
    'admin.saving': 'ກຳລັງບັນທຶກ...',
    'admin.saved': 'ບັນທຶກການຕັ້ງຄ່າແລ້ວ',
    'admin.normal_status': 'ເຮັດວຽກປົກກະຕິ',
  },
  en: {
    // Navigation
    'nav.dashboard': 'Dashboard',
    'nav.products': 'Products',
    'nav.business': 'Business & Branches',
    'nav.members': 'Members',
    'nav.roles': 'Roles & Permissions',
    'nav.security': 'Security',
    'nav.activity': 'Activity Log',
    'nav.platform_dashboard': 'Platform Console',
    'nav.platform_businesses': 'Businesses',
    'nav.platform_users': 'System Users',
    'nav.platform_security': 'Security',
    'nav.platform_activity': 'Activity Log',
    'nav.platform_settings': 'Platform Settings',

    // Headers & Common actions
    'header.search_placeholder': 'Search menu...',
    'header.business_workspace': 'Business workspace',
    'header.platform_management': 'Platform management',
    'header.platform_console': 'Platform console',
    'header.platform_dashboard_sub': 'System Dashboard',
    'header.switch_business': 'Switch business',
    'header.logout': 'Sign out',
    'header.notifications': 'Notifications',
    'header.language': 'Language',
    'header.soon': 'SOON',

    // UI Preferences Menu
    'pref.title': 'Display Preferences',
    'pref.hint': 'Saved on this browser',
    'pref.default': 'Reset default',
    'pref.size': 'Size',
    'pref.color': 'Theme Color',
    'pref.button_tooltip': 'Adjust appearance',

    // Language selector
    'lang.select_language': 'Select language',
    'lang.language_settings': 'Language settings',

    // Dashboard
    'dash.welcome': 'Hello',
    'dash.welcome_sub': 'Welcome to your workspace. Start managing business data from the left menu.',
    'dash.account_status': 'Account Status',
    'dash.ready_to_use': 'Ready to use',
    'dash.accessible_branches': 'Accessible Branches',
    'dash.all_branches': 'All branches',
    'dash.allowed_branches': 'Authorized branches',
    'dash.currency': 'Currency',
    'dash.currency_note': 'Primary currency',
    'dash.user_permissions': 'Permissions',
    'dash.permissions_count': 'Active permissions',
    'dash.workspace_overview': 'Workspace overview',
    'dash.your_branches': 'Your Branches',
    'dash.manage_branches': 'Manage branches →',
    'dash.no_branches': 'No branches yet',
    'dash.no_branches_sub': 'Create your first branch to get started.',
    'dash.code_prefix': 'Code: ',
    'dash.quick_start': 'Quick start',
    'dash.quick_start_title': 'Setup Your Workspace',
    'dash.quick_start_desc': 'Start by adding branches, team members, and catalog products.',
    'dash.add_product': 'Add product →',
    'dash.available_now': 'Available now',
    'dash.system_status': 'System Status',
    'dash.tenant_context': 'Tenant context',
    'dash.role_permission': 'Role & permission',
    'dash.catalog': 'Catalog',

    // Superadmin Settings
    'admin.settings_title': 'General Settings',
    'admin.settings_desc': 'Global platform configuration for SME Flow',
    'admin.platform_name': 'Platform Name',
    'admin.support_email': 'Support Email',
    'admin.default_locale': 'Default Language',
    'admin.default_currency': 'Default Currency',
    'admin.default_timezone': 'Default Timezone',
    'admin.timezone_hint': 'Use IANA timezone, e.g. Asia/Vientiane',
    'admin.public_registration': 'Enable public registration',
    'admin.public_reg_hint': 'When disabled, backend will reject new tenant registrations.',
    'admin.save': 'Save settings',
    'admin.saving': 'Saving...',
    'admin.saved': 'Settings saved successfully',
    'admin.normal_status': 'Operational',
  },
  th: {
    // Navigation
    'nav.dashboard': 'หน้าหลัก',
    'nav.products': 'สินค้า',
    'nav.business': 'ธุรกิจและสาขา',
    'nav.members': 'สมาชิก',
    'nav.roles': 'บทบาทและสิทธิ์',
    'nav.security': 'ความปลอดภัย',
    'nav.activity': 'บันทึกกิจกรรม',
    'nav.platform_dashboard': 'แผงควบคุมระบบ',
    'nav.platform_businesses': 'ธุรกิจทั้งหมด',
    'nav.platform_users': 'ผู้ใช้ในระบบ',
    'nav.platform_security': 'ความปลอดภัย',
    'nav.platform_activity': 'บันทึกกิจกรรม',
    'nav.platform_settings': 'ตั้งค่าระบบ',

    // Headers & Common actions
    'header.search_placeholder': 'ค้นหาเมนู...',
    'header.business_workspace': 'Business workspace',
    'header.platform_management': 'Platform management',
    'header.platform_console': 'Platform console',
    'header.platform_dashboard_sub': 'แผงควบคุมระบบ',
    'header.switch_business': 'เปลี่ยนธุรกิจ',
    'header.logout': 'ออกจากระบบ',
    'header.notifications': 'การแจ้งเตือน',
    'header.language': 'ภาษา',
    'header.soon': 'เร็วๆ นี้',

    // UI Preferences Menu
    'pref.title': 'รูปแบบการแสดงผล',
    'pref.hint': 'จดจำค่าไว้ในเบราว์เซอร์นี้',
    'pref.default': 'คืนค่าเริ่มต้น',
    'pref.size': 'ขนาดตัวอักษร',
    'pref.color': 'สีหลัก',
    'pref.button_tooltip': 'ปรับแต่งการแสดงผล',

    // Language selector
    'lang.select_language': 'เลือกภาษา',
    'lang.language_settings': 'ตั้งค่าภาษา',

    // Dashboard
    'dash.welcome': 'สวัสดี',
    'dash.welcome_sub': 'ยินดีต้อนรับสู่ workspace ของคุณ เริ่มจัดการข้อมูลธุรกิจได้จากเมนูด้านซ้าย',
    'dash.account_status': 'สถานะบัญชี',
    'dash.ready_to_use': 'พร้อมใช้งาน',
    'dash.accessible_branches': 'สาขาที่เข้าถึงได้',
    'dash.all_branches': 'ทุกสาขา',
    'dash.allowed_branches': 'สาขาที่ได้รับอนุญาต',
    'dash.currency': 'สกุลเงิน',
    'dash.currency_note': 'สกุลเงินหลักของธุรกิจ',
    'dash.user_permissions': 'สิทธิ์ผู้ใช้',
    'dash.permissions_count': 'สิทธิ์ที่เปิดใช้งาน',
    'dash.workspace_overview': 'ภาพรวม Workspace',
    'dash.your_branches': 'สาขาของคุณ',
    'dash.manage_branches': 'จัดการสาขา →',
    'dash.no_branches': 'ยังไม่มีสาขา',
    'dash.no_branches_sub': 'สร้างสาขาแรกของคุณเพื่อเริ่มต้นใช้งาน',
    'dash.code_prefix': 'รหัส: ',
    'dash.quick_start': 'เริ่มต้นอย่างรวดเร็ว',
    'dash.quick_start_title': 'ตั้งค่าโครงสร้างให้พร้อม',
    'dash.quick_start_desc': 'เริ่มต้นจากสาขา, เพิ่มสมาชิก และเพิ่มสินค้าของคุณ',
    'dash.add_product': 'เพิ่มสินค้า →',
    'dash.available_now': 'ความพร้อมใช้งาน',
    'dash.system_status': 'สถานะระบบ',
    'dash.tenant_context': 'Tenant context',
    'dash.role_permission': 'Role & permission',
    'dash.catalog': 'Catalog',

    // Superadmin Settings
    'admin.settings_title': 'การตั้งค่าระบบหลัก',
    'admin.settings_desc': 'การกำหนดค่าส่วนกลางสำหรับ SME Flow',
    'admin.platform_name': 'ชื่อระบบ',
    'admin.support_email': 'อีเมลซัพพอร์ต',
    'admin.default_locale': 'ภาษาเริ่มต้น',
    'admin.default_currency': 'สกุลเงินเริ่มต้น',
    'admin.default_timezone': 'เขตเวลาเริ่มต้น',
    'admin.timezone_hint': 'ใช้ IANA timezone เช่น Asia/Bangkok',
    'admin.public_registration': 'เปิดรับสมัครสมาชิกสาธารณะ',
    'admin.public_reg_hint': 'เมื่อปิดใช้งาน ระบบจะปฏิเสธการลงทะเบียนใหม่',
    'admin.save': 'บันทึกการตั้งค่า',
    'admin.saving': 'กำลังบันทึก...',
    'admin.saved': 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
    'admin.normal_status': 'ทำงานปกติ',
  },
  zh: {
    // Navigation
    'nav.dashboard': '首页控制台',
    'nav.products': '商品管理',
    'nav.business': '企业与分支',
    'nav.members': '成员管理',
    'nav.roles': '角色与权限',
    'nav.security': '安全设置',
    'nav.activity': '操作日志',
    'nav.platform_dashboard': '平台控制台',
    'nav.platform_businesses': '企业列表',
    'nav.platform_users': '系统用户',
    'nav.platform_security': '安全管理',
    'nav.platform_activity': '审计日志',
    'nav.platform_settings': '系统设置',

    // Headers & Common actions
    'header.search_placeholder': '搜索菜单...',
    'header.business_workspace': '企业工作区',
    'header.platform_management': '平台管理',
    'header.platform_console': '管理控制台',
    'header.platform_dashboard_sub': '系统管理面板',
    'header.switch_business': '切换企业',
    'header.logout': '退出登录',
    'header.notifications': '通知中心',
    'header.language': '语言',
    'header.soon': '即将推出',

    // UI Preferences Menu
    'pref.title': '界面外观偏好',
    'pref.hint': '保存在当前浏览器中',
    'pref.default': '恢复默认',
    'pref.size': '字体大小',
    'pref.color': '主题色彩',
    'pref.button_tooltip': '自定义界面',

    // Language selector
    'lang.select_language': '选择界面语言',
    'lang.language_settings': '语言设置',

    // Dashboard
    'dash.welcome': '您好',
    'dash.welcome_sub': '欢迎进入企业工作区。您可以从左侧导航菜单开始管理业务数据。',
    'dash.account_status': '账户状态',
    'dash.ready_to_use': '正常运行',
    'dash.accessible_branches': '可访问分支',
    'dash.all_branches': '全部可用分支',
    'dash.allowed_branches': '已授权分支',
    'dash.currency': '记账币种',
    'dash.currency_note': '企业默认币种',
    'dash.user_permissions': '权限数量',
    'dash.permissions_count': '当前持有权限',
    'dash.workspace_overview': '工作区总览',
    'dash.your_branches': '分支机构',
    'dash.manage_branches': '管理分支 →',
    'dash.no_branches': '暂无分支',
    'dash.no_branches_sub': '创建您的第一个分支机构以开始使用。',
    'dash.code_prefix': '编码: ',
    'dash.quick_start': '快速上手',
    'dash.quick_start_title': '完善业务架构',
    'dash.quick_start_desc': '按步骤添加分支机构、邀请成员并录入商品目录。',
    'dash.add_product': '新增商品 →',
    'dash.available_now': '系统运行状态',
    'dash.system_status': '服务状态',
    'dash.tenant_context': '多租户隔离',
    'dash.role_permission': '角色权限系统',
    'dash.catalog': '商品目录',

    // Superadmin Settings
    'admin.settings_title': '核心参数配置',
    'admin.settings_desc': 'SME Flow 全局系统配置',
    'admin.platform_name': '平台名称',
    'admin.support_email': '技术支持邮箱',
    'admin.default_locale': '默认系统语言',
    'admin.default_currency': '默认主币种',
    'admin.default_timezone': '默认时区',
    'admin.timezone_hint': '请使用 IANA 标准时区，例如: Asia/Shanghai',
    'admin.public_registration': '开放公开注册',
    'admin.public_reg_hint': '关闭后，后端服务将拒绝所有外部新注册请求。',
    'admin.save': '保存配置',
    'admin.saving': '正在保存...',
    'admin.saved': '系统设置已成功保存',
    'admin.normal_status': '运行正常',
  },
  vi: {
    // Navigation
    'nav.dashboard': 'Trang chủ',
    'nav.products': 'Sản phẩm',
    'nav.business': 'Doanh nghiệp & Chi nhánh',
    'nav.members': 'Thành viên',
    'nav.roles': 'Vai trò & Quyền hạn',
    'nav.security': 'Bảo mật',
    'nav.activity': 'Nhật ký hoạt động',
    'nav.platform_dashboard': 'Bảng điều khiển hệ thống',
    'nav.platform_businesses': 'Danh sách doanh nghiệp',
    'nav.platform_users': 'Người dùng hệ thống',
    'nav.platform_security': 'Bảo mật hệ thống',
    'nav.platform_activity': 'Nhật ký kiểm toán',
    'nav.platform_settings': 'Cài đặt hệ thống',

    // Headers & Common actions
    'header.search_placeholder': 'Tìm kiếm menu...',
    'header.business_workspace': 'Không gian làm việc',
    'header.platform_management': 'Quản trị nền tảng',
    'header.platform_console': 'Bảng điều khiển',
    'header.platform_dashboard_sub': 'Bảng điều khiển hệ thống',
    'header.switch_business': 'Đổi doanh nghiệp',
    'header.logout': 'Đăng xuất',
    'header.notifications': 'Thông báo',
    'header.language': 'Ngôn ngữ',
    'header.soon': 'SẮP RA MẮT',

    // UI Preferences Menu
    'pref.title': 'Giao diện hiển thị',
    'pref.hint': 'Lưu trên trình duyệt này',
    'pref.default': 'Mặc định',
    'pref.size': 'Kích cỡ chữ',
    'pref.color': 'Màu chủ đạo',
    'pref.button_tooltip': 'Tùy chỉnh giao diện',

    // Language selector
    'lang.select_language': 'Chọn ngôn ngữ',
    'lang.language_settings': 'Cài đặt ngôn ngữ',

    // Dashboard
    'dash.welcome': 'Xin chào',
    'dash.welcome_sub': 'Chào mừng bạn đến với không gian làm việc. Bắt đầu quản lý dữ liệu từ menu bên trái.',
    'dash.account_status': 'Trạng thái tài khoản',
    'dash.ready_to_use': 'Sẵn sàng sử dụng',
    'dash.accessible_branches': 'Chi nhánh truy cập',
    'dash.all_branches': 'Tất cả chi nhánh',
    'dash.allowed_branches': 'Chi nhánh được phép',
    'dash.currency': 'Tiền tệ',
    'dash.currency_note': 'Tiền tệ chính doanh nghiệp',
    'dash.user_permissions': 'Quyền hạn',
    'dash.permissions_count': 'Quyền đang hoạt động',
    'dash.workspace_overview': 'Tổng quan không gian làm việc',
    'dash.your_branches': 'Chi nhánh của bạn',
    'dash.manage_branches': 'Quản lý chi nhánh →',
    'dash.no_branches': 'Chưa có chi nhánh',
    'dash.no_branches_sub': 'Tạo chi nhánh đầu tiên để bắt đầu sử dụng.',
    'dash.code_prefix': 'Mã: ',
    'dash.quick_start': 'Khởi đầu nhanh',
    'dash.quick_start_title': 'Thiết lập cấu trúc hoàn chỉnh',
    'dash.quick_start_desc': 'Bắt đầu từ chi nhánh, mời thành viên và thêm sản phẩm vào danh mục.',
    'dash.add_product': 'Thêm sản phẩm →',
    'dash.available_now': 'Trạng thái hiện tại',
    'dash.system_status': 'Trạng thái hệ thống',
    'dash.tenant_context': 'Ngữ cảnh Tenant',
    'dash.role_permission': 'Vai trò & quyền hạn',
    'dash.catalog': 'Danh mục sản phẩm',

    // Superadmin Settings
    'admin.settings_title': 'Cài đặt chung',
    'admin.settings_desc': 'Cấu hình toàn hệ thống cho SME Flow',
    'admin.platform_name': 'Tên nền tảng',
    'admin.support_email': 'Email hỗ trợ',
    'admin.default_locale': 'Ngôn ngữ mặc định',
    'admin.default_currency': 'Tiền tệ mặc định',
    'admin.default_timezone': 'Múi giờ mặc định',
    'admin.timezone_hint': 'Sử dụng múi giờ IANA, ví dụ: Asia/Ho_Chi_Minh',
    'admin.public_registration': 'Mở đăng ký công khai',
    'admin.public_reg_hint': 'Khi tắt, backend sẽ từ chối tất cả đăng ký tài khoản mới.',
    'admin.save': 'Lưu cấu hình',
    'admin.saving': 'Đang lưu...',
    'admin.saved': 'Đã lưu cấu hình thành công',
    'admin.normal_status': 'Hoạt động bình thường',
  },
}

export const translations: Record<SupportedLocale, Record<string, string>> = {
  lo: { ...baseTranslations.lo, ...uiTranslations.lo },
  en: { ...baseTranslations.en, ...uiTranslations.en },
  th: { ...baseTranslations.th, ...uiTranslations.th },
  zh: { ...baseTranslations.zh, ...uiTranslations.zh },
  vi: { ...baseTranslations.vi, ...uiTranslations.vi },
}

export const translate = (locale: SupportedLocale, key: string, fallback?: string): string => {
  const dict = translations[locale]
  const val = dict?.[key]
  if (typeof val === 'string') {
    return val
  }
  // Fallback to Lao default
  const defaultDict = translations[defaultLocale]
  const defaultVal = defaultDict?.[key]
  if (typeof defaultVal === 'string') {
    return defaultVal
  }
  return fallback ?? key
}
