-- Migration: 013_seed.sql
-- Description: Initial seed data for system roles, permissions, and business categories

-- 1. Seed System Roles
INSERT INTO public.roles (name, description_ar) VALUES
    ('customer', 'عميل افتراضي للتطبيق يستفيد من الخدمات والتسوق والتنقل'),
    ('driver', 'كابتن وسائق في Kafrawy Go لتوصيل الأفراد والطرود'),
    ('provider', 'مقدم خدمات وصيانة وحرفي فردي أو شركة صيانة'),
    ('merchant', 'تاجر وصاحب متجر في Kafrawy Marketplace'),
    ('employer', 'صاحب عمل أو مسلك توظيف لنشر الوظائف'),
    ('admin', 'مدير النظام ومسؤول الحوكمة والإشراف الكامل')
ON CONFLICT (name) DO NOTHING;

-- 2. Seed Permissions
INSERT INTO public.permissions (code, module, description_ar) VALUES
    ('services:read', 'services', 'تصفح دليل الخدمات والمحلات'),
    ('services:request', 'services', 'رفع طلب خدمة جديدة'),
    ('services:fulfill', 'services', 'استقبال وقبول طلبات الخدمات'),
    ('rides:request', 'mobility', 'طلب رحلة جديدة'),
    ('rides:accept', 'mobility', 'قبول وتنفيذ الرحلة من الكابتن'),
    ('jobs:post', 'jobs', 'نشر وتحديث إعلانات الوظائف'),
    ('jobs:apply', 'jobs', 'التقديم على الفرص الوظيفية'),
    ('marketplace:buy', 'marketplace', 'الشراء والشحن من المنتجات'),
    ('marketplace:sell', 'marketplace', 'إدراج وإدارة المنتجات والمتاجر'),
    ('admin:all', 'admin', 'صلاحيات الإشراف الشامل والتنفيذي')
ON CONFLICT (code) DO NOTHING;

-- 3. Seed Service Categories (كفر البطيخ والمدن المجاورة)
INSERT INTO public.service_categories (name_ar, description_ar, icon_url, sort_order) VALUES
    ('صيانة منزلية وسباكة', 'خدمات السباكة والكهرباء والتكييف والتركيبات المنزلية', 'wrench', 1),
    ('أجهزة كهربائية وإلكترونيات', 'تصليح الثلاجات، الغسالات، والشاشات والأجهزة الإلكترونية', 'tv', 2),
    ('نقاشة وتشطيبات', 'أعمال الدهانات، الجبس بورد، والتشطيبات المتكاملة', 'paint-bucket', 3),
    ('تنظيف ومكافحة حشرات', 'تنظيف المنازل، السجاد، والمفروشات ومكافحة الآفات', 'sparkles', 4),
    ('سيارات وميكانيكا', 'ميكانيكا السيارات، الكهرباء، والخدمات السريعة على الطريق', 'car', 5),
    ('تعليم واستشارات', 'دروس خصوصية، استشارات قانونية ومالية ومحاسبية', 'book-open', 6)
ON CONFLICT (name_ar) DO NOTHING;

-- 4. Seed Product Categories
INSERT INTO public.product_categories (name_ar, icon_url, sort_order) VALUES
    ('بقالة ومواد غذائية', 'shopping-bag', 1),
    ('مأكولات ومطاعم محلية', 'utensils', 2),
    ('إلكترونيات وهواتف', 'smartphone', 3),
    ('ملابس وأزياء', 'shirt', 4),
    ('مستلزمات منزلية', 'home', 5),
    ('أدوية ومستلزمات طبية', 'pill', 6)
ON CONFLICT (name_ar) DO NOTHING;

-- 5. Seed Job Categories
INSERT INTO public.job_categories (name_ar) VALUES
    ('مبيعات وتسويق'),
    ('تكنولوجيا معلومات وبرمجة'),
    ('محاسبة ومالية'),
    ('سائقي نقل وتوصيل'),
    ('خدمة عملاء واستقبال'),
    ('حرفيين وفنيين صيانة'),
    ('مهندسين وإنشاءات')
ON CONFLICT (name_ar) DO NOTHING;
