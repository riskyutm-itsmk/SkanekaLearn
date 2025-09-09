/*
  # Add Quiz Auto-Correction System

  1. Updates
    - Ensure quiz_answers table has proper structure for auto-correction
    - Add function to calculate quiz scores automatically
    - Update task_submissions to store calculated scores

  2. Security
    - No RLS needed as we removed it previously
    - Direct database access for all operations
*/

-- Ensure quiz_answers table structure is correct
DO $$
BEGIN
  -- Add benar_salah column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quiz_answers' AND column_name = 'benar_salah'
  ) THEN
    ALTER TABLE quiz_answers ADD COLUMN benar_salah boolean DEFAULT false;
  END IF;
END $$;

-- Create function to auto-calculate quiz scores
CREATE OR REPLACE FUNCTION calculate_quiz_score(task_id_param uuid, siswa_id_param uuid)
RETURNS integer AS $$
DECLARE
  total_questions integer;
  correct_answers integer;
  final_score integer;
BEGIN
  -- Count total questions for this quiz
  SELECT COUNT(*) INTO total_questions
  FROM quiz_questions
  WHERE task_id = task_id_param;

  -- Count correct answers for this student
  SELECT COUNT(*) INTO correct_answers
  FROM quiz_answers qa
  JOIN quiz_questions qq ON qa.question_id = qq.id
  WHERE qq.task_id = task_id_param 
    AND qa.siswa_id = siswa_id_param 
    AND qa.benar_salah = true;

  -- Calculate percentage score
  IF total_questions > 0 THEN
    final_score := ROUND((correct_answers::decimal / total_questions::decimal) * 100);
  ELSE
    final_score := 0;
  END IF;

  RETURN final_score;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to auto-update submission score
CREATE OR REPLACE FUNCTION update_quiz_submission_score()
RETURNS TRIGGER AS $$
DECLARE
  task_id_val uuid;
  calculated_score integer;
BEGIN
  -- Get task_id from the question
  SELECT qq.task_id INTO task_id_val
  FROM quiz_questions qq
  WHERE qq.id = NEW.question_id;

  -- Calculate the score for this student's quiz
  calculated_score := calculate_quiz_score(task_id_val, NEW.siswa_id);

  -- Update the task_submission with the calculated score
  UPDATE task_submissions
  SET nilai = calculated_score
  WHERE task_id = task_id_val AND siswa_id = NEW.siswa_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update scores when answers are submitted
DROP TRIGGER IF EXISTS trigger_update_quiz_score ON quiz_answers;
CREATE TRIGGER trigger_update_quiz_score
  AFTER INSERT OR UPDATE ON quiz_answers
  FOR EACH ROW
  EXECUTE FUNCTION update_quiz_submission_score();