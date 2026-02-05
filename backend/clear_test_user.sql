-- Clear all test data (run this as new user simulation)
DELETE FROM memory_confirmations WHERE user_id LIKE '%test%' OR user_id LIKE '%example%';
DELETE FROM memory_notifications WHERE user_id LIKE '%test%' OR user_id LIKE '%example%';
DELETE FROM memories WHERE user_id LIKE '%test%' OR user_id LIKE '%example%';
DELETE FROM memory_triggers WHERE user_id LIKE '%test%' OR user_id LIKE '%example%';
-- Clear ALL data for fresh start:
-- DELETE FROM memory_confirmations;
-- DELETE FROM memory_notifications;  
-- DELETE FROM memories;
-- DELETE FROM memory_triggers;
